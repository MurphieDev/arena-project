// src/users/pages/settings/channelData.ts
// Real Firebase channel data helpers

import { db } from '../../../lib/firebase';
import {
  collection, getDocs, doc, getDoc, updateDoc,
  deleteDoc, serverTimestamp
} from 'firebase/firestore';

export interface ChannelMember {
  id: string;
  name: string;
  handle: string;
  joinedAt: string;
  role: 'member' | 'admin';
  profilePicture?: string;
  winRate?: number;
}

export interface ChannelData {
  id: string;
  name: string;
  type: 'free' | 'paid';
  price: number;
  subscribers: number;
  winRate: string;
  bio: string;
  sports: string[];
  createdAt: string;
}

export async function getChannelsByOwner(ownerId: string): Promise<ChannelData[]> {
  try {
    const snap = await getDocs(collection(db, 'channels'));
    return snap.docs
      .filter(d => d.data().ownerId === ownerId)
      .map(d => {
        const data = d.data();
        const date = data.createdAt?.toDate?.() || new Date();
        return {
          id: d.id,
          name: data.name || 'Channel',
          type: data.type || 'free',
          price: data.price || 0,
          subscribers: data.subscribers || 0,
          winRate: `${data.winRate || 0}%`,
          bio: data.bio || '',
          sports: data.sports || [],
          createdAt: date.toLocaleDateString('en', { month: 'short', year: 'numeric' }),
        };
      });
  } catch {
    return [];
  }
}

export async function getChannelMembers(channelId: string): Promise<ChannelMember[]> {
  try {
    const snap = await getDocs(collection(db, 'channels', channelId, 'members'));
    const members: ChannelMember[] = [];
    for (const d of snap.docs) {
      const userDoc = await getDoc(doc(db, 'users', d.id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const joinDate = d.data().joinedAt?.toDate?.() || new Date();
        members.push({
          id: d.id,
          name: userData.displayName || 'User',
          handle: `@${(userData.displayName || '').toLowerCase().replace(/\s/g, '')}`,
          joinedAt: joinDate.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }),
          role: d.data().role || 'member',
          profilePicture: userData.profilePicture,
          winRate: userData.winRate,
        });
      }
    }
    return members;
  } catch {
    return [];
  }
}

export async function removeMember(channelId: string, memberId: string): Promise<void> {
  await deleteDoc(doc(db, 'channels', channelId, 'members', memberId));
  await updateDoc(doc(db, 'channels', channelId), {
    subscribers: (await getDoc(doc(db, 'channels', channelId))).data()?.subscribers - 1 || 0,
  });
}

export async function updateChannelSettings(channelId: string, data: Partial<ChannelData>): Promise<void> {
  await updateDoc(doc(db, 'channels', channelId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
