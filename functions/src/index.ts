import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

const SPORTS_DB_KEY = "1";

// ── 1. When a tip is created ───────────────────────────────────────────────
export const onTipCreated = onDocumentCreated(
  "channels/{channelId}/tips/{tipId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const tip = snap.data();
    const channelId = event.params.channelId;
    const tipId = event.params.tipId;

    try {
      const membersSnap = await db
        .collection("channels")
        .doc(channelId)
        .collection("members")
        .get();

      const batch = db.batch();
      membersSnap.docs.forEach((member) => {
        const feedRef = db
          .collection("users")
          .doc(member.id)
          .collection("feed")
          .doc(tipId);
        batch.set(feedRef, {
          tipId,
          channelId,
          tipsterId: tip.tipsterId,
          createdAt: tip.createdAt,
        });
      });
      await batch.commit();

      // Increment tipster tipsCount
      await db.collection("users").doc(tip.tipsterId).update({
        tipsCount: admin.firestore.FieldValue.increment(1),
      });

      // Check paid channel eligibility
      const tipsterDoc = await db.collection("users").doc(tip.tipsterId).get();
      const tipsterData = tipsterDoc.data();

      if (
        tipsterData &&
        tipsterData.tipsCount >= 7 &&
        tipsterData.winRate >= 50 &&
        !tipsterData.paidChannelEligible
      ) {
        await db.collection("users").doc(tip.tipsterId).update({
          paidChannelEligible: true,
        });

        await db.collection("notifications").add({
          userId: tip.tipsterId,
          type: "paid_channel_eligible",
          title: "🎉 You can now create a paid channel!",
          message:
            "Congratulations! You have posted 7+ tips and have a 50%+ win rate. You are now eligible to create a paid channel.",
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      logger.info(`Tip ${tipId} fanned out to ${membersSnap.size} members`);
    } catch (error) {
      logger.error("Error in onTipCreated:", error);
    }
  }
);

// ── 2. Auto update tip results every 30 minutes ────────────────────────────
export const updateTipResults = onSchedule("every 30 minutes", async () => {
  try {
    const channelsSnap = await db.collection("channels").get();

    for (const channelDoc of channelsSnap.docs) {
      const tipsSnap = await db
        .collection("channels")
        .doc(channelDoc.id)
        .collection("tips")
        .where("status", "==", "pending")
        .get();

      for (const tipDoc of tipsSnap.docs) {
        const tip = tipDoc.data();
        const matches = tip.matches || [];
        let allSettled = true;
        let allWon = true;
        const updatedMatches: any[] = [];

        for (const match of matches) {
          if (match.status !== "pending") {
            updatedMatches.push(match);
            if (match.status === "lost") allWon = false;
            continue;
          }

          const url = `https://www.thesportsdb.com/api/v1/json/${SPORTS_DB_KEY}/searchevents.php?e=${encodeURIComponent(
            match.home + " vs " + match.away
          )}`;

          const response = await fetch(url);
          const data = (await response.json()) as { events: any[] };

          if (data.events && data.events.length > 0) {
            const ev = data.events[0];
            const homeScore = parseInt(ev.intHomeScore);
            const awayScore = parseInt(ev.intAwayScore);

            if (!isNaN(homeScore) && !isNaN(awayScore)) {
              let result = "pending";
              const prediction = tip.prediction?.toLowerCase();

              if (prediction?.includes("home win")) {
                result = homeScore > awayScore ? "win" : "lost";
              } else if (prediction?.includes("away win")) {
                result = awayScore > homeScore ? "win" : "lost";
              } else if (prediction?.includes("draw")) {
                result = homeScore === awayScore ? "win" : "lost";
              } else if (prediction?.includes("over 2.5")) {
                result = homeScore + awayScore > 2.5 ? "win" : "lost";
              } else if (prediction?.includes("under 2.5")) {
                result = homeScore + awayScore < 2.5 ? "win" : "lost";
              } else if (prediction?.includes("btts")) {
                result = homeScore > 0 && awayScore > 0 ? "win" : "lost";
              } else {
                result = "pending";
                allSettled = false;
              }

              if (result === "lost") allWon = false;
              updatedMatches.push({ ...match, status: result });
            } else {
              allSettled = false;
              updatedMatches.push(match);
            }
          } else {
            allSettled = false;
            updatedMatches.push(match);
          }
        }

        const newStatus = allSettled ? (allWon ? "won" : "lost") : "pending";

        await tipDoc.ref.update({
          matches: updatedMatches,
          status: newStatus,
        });

        if (allSettled) {
          await updateTipsterWinRate(tip.tipsterId, channelDoc.id);

          const membersSnap = await db
            .collection("channels")
            .doc(channelDoc.id)
            .collection("members")
            .get();

          const batch = db.batch();
          membersSnap.docs.forEach((member) => {
            const notifRef = db.collection("notifications").doc();
            batch.set(notifRef, {
              userId: member.id,
              type: "tip_result",
              title: allWon ? "🎉 Tip Won!" : "❌ Tip Lost",
              message: `${tip.tipsterName}'s tip "${tip.prediction}" has been settled.`,
              tipId: tipDoc.id,
              channelId: channelDoc.id,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
        }
      }
    }

    logger.info("Tip results updated successfully");
  } catch (error) {
    logger.error("Error updating tip results:", error);
  }
});

// ── 3. Update tipster win rate ─────────────────────────────────────────────
async function updateTipsterWinRate(tipsterId: string, channelId: string) {
  const tipsSnap = await db
    .collection("channels")
    .doc(channelId)
    .collection("tips")
    .where("tipsterId", "==", tipsterId)
    .where("status", "in", ["won", "lost"])
    .get();

  const total = tipsSnap.size;
  const won = tipsSnap.docs.filter((d) => d.data().status === "won").length;
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

  await db.collection("users").doc(tipsterId).update({ winRate });
}

// ── 4. When user follows a tipster ────────────────────────────────────────
export const onFollowTipster = onDocumentCreated(
  "users/{userId}/following/{tipsterId}",
  async (event) => {
    const userId = event.params.userId;
    const tipsterId = event.params.tipsterId;

    try {
      await db.collection("users").doc(tipsterId).update({
        followersCount: admin.firestore.FieldValue.increment(1),
      });

      await db.collection("users").doc(userId).update({
        followingCount: admin.firestore.FieldValue.increment(1),
      });

      await db.collection("notifications").add({
        userId: tipsterId,
        type: "new_follower",
        title: "New Follower! 👥",
        message: "Someone just followed you.",
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`User ${userId} followed tipster ${tipsterId}`);
    } catch (error) {
      logger.error("Error in onFollowTipster:", error);
    }
  }
);

// ── 5. When user unfollows a tipster ──────────────────────────────────────
export const onUnfollowTipster = onDocumentDeleted(
  "users/{userId}/following/{tipsterId}",
  async (event) => {
    const userId = event.params.userId;
    const tipsterId = event.params.tipsterId;

    try {
      await db.collection("users").doc(tipsterId).update({
        followersCount: admin.firestore.FieldValue.increment(-1),
      });

      await db.collection("users").doc(userId).update({
        followingCount: admin.firestore.FieldValue.increment(-1),
      });

      logger.info(`User ${userId} unfollowed tipster ${tipsterId}`);
    } catch (error) {
      logger.error("Error in onUnfollowTipster:", error);
    }
  }
);

// ── 6. When a tip is liked ────────────────────────────────────────────────
export const onTipLiked = onDocumentCreated(
  "channels/{channelId}/tips/{tipId}/likes/{userId}",
  async (event) => {
    const channelId = event.params.channelId;
    const tipId = event.params.tipId;

    try {
      await db
        .collection("channels")
        .doc(channelId)
        .collection("tips")
        .doc(tipId)
        .update({
          likesCount: admin.firestore.FieldValue.increment(1),
        });

      logger.info(`Tip ${tipId} liked`);
    } catch (error) {
      logger.error("Error in onTipLiked:", error);
    }
  }
);

// ── 7. When a user joins a channel ────────────────────────────────────────
export const onChannelJoined = onDocumentCreated(
  "channels/{channelId}/members/{userId}",
  async (event) => {
    const channelId = event.params.channelId;

    try {
      await db.collection("channels").doc(channelId).update({
        members: admin.firestore.FieldValue.increment(1),
      });

      logger.info(`Member joined channel ${channelId}`);
    } catch (error) {
      logger.error("Error in onChannelJoined:", error);
    }
  }
);

// ── 8. Paystack payment webhook ───────────────────────────────────────────
export const paystackWebhook = onRequest(async (req, res) => {
  try {
    const event = req.body;

    if (event.event === "charge.success") {
      const { metadata, amount } = event.data;
      const { userId, channelId, tipsterId } = metadata;

      const platformFee = amount * 0.1;
      const tipsterAmount = amount - platformFee;

      // Add user to channel
      await db
        .collection("channels")
        .doc(channelId)
        .collection("members")
        .doc(userId)
        .set({
          userId,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          amountPaid: amount / 100,
        });

      // Credit tipster wallet (90%)
      await db.collection("users").doc(tipsterId).update({
        walletBalance: admin.firestore.FieldValue.increment(tipsterAmount / 100),
      });

      // Credit Arena wallet (10%)
      await db.collection("platform").doc("wallet").set(
        {
          totalEarnings: admin.firestore.FieldValue.increment(platformFee / 100),
        },
        { merge: true }
      );

      // Record transaction
      await db.collection("transactions").add({
        userId,
        tipsterId,
        channelId,
        totalAmount: amount / 100,
        tipsterAmount: tipsterAmount / 100,
        platformFee: platformFee / 100,
        type: "channel_join",
        status: "success",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Notify tipster
      await db.collection("notifications").add({
        userId: tipsterId,
        type: "new_payment",
        title: "💰 New Payment Received!",
        message: `Someone just joined your paid channel. ₦${(tipsterAmount / 100).toLocaleString()} has been added to your wallet.`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`Payment successful - User ${userId} joined channel ${channelId}`);
    }

    res.status(200).send("OK");
  } catch (error) {
    logger.error("Webhook error:", error);
    res.status(500).send("Error");
  }
});
