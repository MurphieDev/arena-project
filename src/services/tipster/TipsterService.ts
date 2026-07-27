// src/services/tipster/TipsterService.ts
// Real Firebase implementation for tipster operations

import { doc, updateDoc, setDoc, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

export interface CreateTipsterRequest {
  channelName: string;
  sports?: string[];
  specialties?: string[];
  bio?: string;
  experience?: string;
  specialization?: string;
  price?: number;
}

export const tipsterService = {
  // Create tipster profile — upgrades user role to tipster
  async createTipsterProfile(data: CreateTipsterRequest): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    // Update user role to tipster
    await updateDoc(doc(db, 'users', user.uid), {
      role: 'tipster',
      channelName: data.channelName,
      sports: data.sports || data.specialties || [],
      bio: data.bio || '',
      experience: data.experience || '',
      specialization: data.specialization || '',
      paidChannelEligible: false,
      winRate: 0,
      tipsCount: 0,
      updatedAt: serverTimestamp(),
    });

    // Create their first free channel automatically
    await setDoc(doc(db, 'channels', `${user.uid}_free`), {
      name: data.channelName,
      ownerId: user.uid,
      type: 'free',
      price: 0,
      subscribers: 0,
      winRate: '0%',
      sports: data.sports || data.specialties || [],
      createdAt: serverTimestamp(),
    });

    // Send notification
    await addDoc(collection(db, 'notifications'), {
      userId: user.uid,
      type: 'tipster_approved',
      title: '🎯 Tipster Account Active!',
      message: `Your tipster account is ready. Start posting tips in ${data.channelName}!`,
      read: false,
      createdAt: serverTimestamp(),
    });
  },

  // Get tipster stats
  async getTipsterStats(userId: string) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;
    const data = userDoc.data();
    return {
      winRate: data.winRate || 0,
      tipsCount: data.tipsCount || 0,
      followersCount: data.followersCount || 0,
      paidChannelEligible: data.paidChannelEligible || false,
    };
  },
};
