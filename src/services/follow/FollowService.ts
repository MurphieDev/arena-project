// src/services/follow/FollowService.ts
// Direct Firestore SDK — matches the schema already established in
// ProfilePage.tsx's TipstersGrid component, so follow state stays
// consistent across the whole app rather than having two competing models.
//
// Schema: subcollections on the user docs themselves —
//   users/{followerId}/following/{followingId}  { userId: followingId, createdAt }
//   users/{followingId}/followers/{followerId}  { userId: followerId, createdAt }
// Both sides get written/deleted together. Counts are cached on
// users/{id}.followersCount / .followingCount (part of AppUser) and kept in
// sync with increment() here.
//
// REQUIRES a Firestore security rule allowing an authenticated user to bump
// followersCount on *someone else's* user doc, e.g.:
//
//   match /users/{userId} {
//     allow update: if request.auth != null &&
//       request.resource.data.diff(resource.data).affectedKeys().hasOnly(['followersCount']);
//   }
//
// (and similarly for followingCount when it's your own doc.)

import {
  doc, setDoc, deleteDoc, getDoc, updateDoc, increment, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

class FollowService {
  private static instance: FollowService;
  private constructor() {}

  static getInstance(): FollowService {
    if (!FollowService.instance) {
      FollowService.instance = new FollowService();
    }
    return FollowService.instance;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (!followerId || !followingId || followerId === followingId) return false;
    const snap = await getDoc(doc(db, 'users', followerId, 'following', followingId));
    return snap.exists();
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) throw new Error("You can't follow yourself");

    await setDoc(doc(db, 'users', followerId, 'following', followingId), {
      userId: followingId,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'users', followingId, 'followers', followerId), {
      userId: followerId,
      createdAt: serverTimestamp(),
    });

    await Promise.all([
      updateDoc(doc(db, 'users', followerId), { followingCount: increment(1) }),
      updateDoc(doc(db, 'users', followingId), { followersCount: increment(1) }),
    ]);
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', followerId, 'following', followingId));
    await deleteDoc(doc(db, 'users', followingId, 'followers', followerId));

    await Promise.all([
      updateDoc(doc(db, 'users', followerId), { followingCount: increment(-1) }),
      updateDoc(doc(db, 'users', followingId), { followersCount: increment(-1) }),
    ]);
  }
}

export const followService = FollowService.getInstance();
