// netlify/functions/check-tips-scheduled.js
//
// This function runs AUTOMATICALLY on Netlify's servers every 30 minutes,
// independent of whether anyone has the Arena app open in their browser.
//
// It uses Firebase Admin SDK to read/write Firestore directly from the server.

const admin = require('firebase-admin');

// ── Initialize Firebase Admin (only once) ─────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
    }),
  });
}

const db = admin.firestore();
const API_KEY = process.env.API_FOOTBALL_KEY || '71b6bd51ec2a77eee7d4a472b85436f0';
const API_BASE = 'https://v3.football.api-sports.io';

// ── Helper: call API-Football ──────────────────────────────────────────────
async function apiCall(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'x-apisports-key': API_KEY },
    });
    const data = await res.json();
    return data.response || [];
  } catch (e) {
    console.error('API call failed:', e.message);
    return [];
  }
}

// ── Prediction checker (same logic as frontend) ────────────────────────────
function checkPrediction(pred, homeScore, awayScore, events) {
  const p = (pred || '').toLowerCase().trim();
  const total = homeScore + awayScore;

  if (p === '1' || p === 'home win' || p === 'home') return homeScore > awayScore;
  if (p === 'x' || p === 'draw') return homeScore === awayScore;
  if (p === '2' || p === 'away win' || p === 'away') return awayScore > homeScore;
  if (p === '1x') return homeScore >= awayScore;
  if (p === 'x2') return awayScore >= homeScore;
  if (p === '12') return homeScore !== awayScore;
  if (p === 'gg' || p === 'btts' || p === 'btts yes' || p === 'both teams to score') return homeScore > 0 && awayScore > 0;
  if (p === 'ng' || p === 'btts no' || p === 'no btts') return homeScore === 0 || awayScore === 0;

  const overMatch = p.match(/^over\s*([\d.]+)/);
  if (overMatch) return total > parseFloat(overMatch[1]);
  const underMatch = p.match(/^under\s*([\d.]+)/);
  if (underMatch) return total < parseFloat(underMatch[1]);

  const scoreMatch = p.match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (scoreMatch) return homeScore === parseInt(scoreMatch[1]) && awayScore === parseInt(scoreMatch[2]);

  if (p === 'home to score' || p === 'home team to score') return homeScore > 0;
  if (p === 'away to score' || p === 'away team to score') return awayScore > 0;

  if (p.includes('clean sheet')) {
    if (p.includes('home')) return awayScore === 0;
    if (p.includes('away')) return homeScore === 0;
    return homeScore === 0 || awayScore === 0;
  }

  if (p.includes('win to nil')) {
    if (p.includes('home')) return homeScore > awayScore && awayScore === 0;
    if (p.includes('away')) return awayScore > homeScore && homeScore === 0;
  }

  if (events && events.length > 0) {
    const goals = events.filter(e => e.type === 'Goal' && e.detail !== 'Missed Penalty');

    if (p === 'goal in first 10 minutes') return goals.some(g => g.time.elapsed <= 10);
    if (p === 'goal in first 15 minutes') return goals.some(g => g.time.elapsed <= 15);
    if (p === 'goal before half time') return goals.some(g => g.time.elapsed < 45);

    if (p.includes('first to score') || p.includes('first team to score')) {
      const firstGoal = [...goals].sort((a, b) => a.time.elapsed - b.time.elapsed)[0];
      if (!firstGoal) return false;
      if (p.includes('home')) return firstGoal.team.name.toLowerCase().includes('home');
      if (p.includes('away')) return firstGoal.team.name.toLowerCase().includes('away');
    }

    if (p.includes('anytime')) {
      const playerName = p.replace('anytime goal scorer', '').replace('anytime scorer', '').trim();
      return goals.some(g => g.player.name.toLowerCase().includes(playerName));
    }

    if (p.includes('first goal scorer') || p.includes('first scorer')) {
      const playerName = p.replace('first goal scorer', '').replace('first scorer', '').trim();
      const firstGoal = [...goals].sort((a, b) => a.time.elapsed - b.time.elapsed)[0];
      return firstGoal ? firstGoal.player.name.toLowerCase().includes(playerName) : false;
    }
  }

  return false;
}

// ── Main handler ─────────────────────────────────────────────────────────
exports.handler = async function (event, context) {
  console.log('🔄 Starting automatic tip verification...');
  let checkedCount = 0;
  let settledCount = 0;

  try {
    const channelsSnap = await db.collection('channels').get();

    for (const channelDoc of channelsSnap.docs) {
      const channelId = channelDoc.id;
      const channelData = channelDoc.data();
      const tipsterId = channelData.ownerId;

      const tipsSnap = await db
        .collection('channels')
        .doc(channelId)
        .collection('tips')
        .where('status', '==', 'pending')
        .get();

      for (const tipDoc of tipsSnap.docs) {
        const tip = tipDoc.data();
        checkedCount++;

        if (!tip.matches || tip.matches.length === 0) continue;

        let allSettled = true;
        let allWon = true;

        for (const match of tip.matches) {
          if (!match.home || !match.away) continue;

          try {
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const fixtures = await apiCall(
              `/fixtures?team=${encodeURIComponent(match.home)}&season=2025&from=${weekAgo}&to=${today}&status=FT`
            );

            const matchedFixture = fixtures.find(f =>
              f.teams.home.name.toLowerCase().includes(match.home.toLowerCase()) &&
              f.teams.away.name.toLowerCase().includes(match.away.toLowerCase())
            );

            if (!matchedFixture) {
              allSettled = false;
              continue;
            }

            const details = await apiCall(`/fixtures?id=${matchedFixture.fixture.id}`);
            const events = details[0]?.events || [];

            const homeScore = matchedFixture.goals.home ?? 0;
            const awayScore = matchedFixture.goals.away ?? 0;
            const prediction = match.prediction || tip.prediction || '';

            const won = checkPrediction(prediction, homeScore, awayScore, events);
            if (!won) allWon = false;
          } catch (e) {
            console.error('Match check error:', e.message);
            allSettled = false;
          }
        }

        if (allSettled) {
          await db
            .collection('channels')
            .doc(channelId)
            .collection('tips')
            .doc(tipDoc.id)
            .update({ status: allWon ? 'won' : 'lost' });

          settledCount++;

          const allTipsSnap = await db
            .collection('channels')
            .doc(channelId)
            .collection('tips')
            .get();

          const allTips = allTipsSnap.docs.map(d => d.data());
          const wonCount = allTips.filter(t => t.status === 'won').length;
          const totalSettled = allTips.filter(t => t.status !== 'pending').length;

          if (totalSettled > 0) {
            await db.collection('users').doc(tipsterId).update({
              winRate: Math.round((wonCount / totalSettled) * 100),
              tipsCount: allTips.length,
              paidChannelEligible: allTips.length >= 5,
            });
          }

          await db.collection('notifications').add({
            userId: tipsterId,
            type: 'tip_result',
            title: allWon ? 'Tip Won! ✅' : 'Tip Lost ❌',
            message: `Your tip in ${channelData.name} has been verified as ${allWon ? 'WON' : 'LOST'}`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const membersSnap = await db
            .collection('channels')
            .doc(channelId)
            .collection('members')
            .get();

          for (const memberDoc of membersSnap.docs) {
            await db.collection('notifications').add({
              userId: memberDoc.id,
              type: 'tip_result',
              title: allWon ? 'Tip Won! ✅' : 'Tip Lost ❌',
              message: `A tip in ${channelData.name} has been verified as ${allWon ? 'WON' : 'LOST'}`,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      }
    }

    console.log(`✅ Done. Checked ${checkedCount} tips, settled ${settledCount}.`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        checked: checkedCount,
        settled: settledCount,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Scheduled tip check failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
