import {
  collection, doc, getDoc, getDocs, query, where, limit,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { apiClient } from '../../api/clients/ApiClient';
import type { AppUser } from '../../core/types';

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  profilePicture?: string; // base64 or URL
}

// Maps a Firestore users/{id} doc into the same AppUser shape that
// AuthService.toAppUser() produces, so both paths stay consistent.
function mapUserDoc(id: string, data: Record<string, any>): AppUser {
  return {
    id,
    uid: id,
    name: data.displayName || 'User',
    displayName: data.displayName || 'User',
    email: data.email || '',
    handle: `@${(data.displayName || 'user').toLowerCase().replace(/\s/g, '')}`,
    role: data.role || 'user',
    verified: data.verified || false,
    profilePicture: data.profilePicture || undefined,
    walletBalance: data.walletBalance || 0,
    winRate: data.winRate || 0,
    tipsCount: data.tipsCount || 0,
    followersCount: data.followersCount || 0,
    followingCount: data.followingCount || 0,
    paidChannelEligible: data.paidChannelEligible || false,
    sports: data.sports || [],
    bio: data.bio || '',
    createdAt: data.createdAt,
  } as AppUser;
}

class UserService {
  private static instance: UserService;
  private apiClient = apiClient;

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // ── Existing apiClient-based methods ────────────────────────────────────
  // NOTE: apiClient currently sends no Authorization header (see
  // ApiClient.ts's getAuthHeaders — it's a stub). These calls will hit
  // whatever's at baseURL + endpoint with no proof of who's asking. Leaving
  // as-is since fixing that is outside what was asked for here, but flagging
  // it since it affects updateProfile/uploadProfilePicture too, not just the
  // new methods below.
  async updateProfile(data: UpdateProfileRequest): Promise<AppUser> {
    return this.apiClient.put('/user/profile', data);
  }

  async uploadProfilePicture(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.apiClient.post('/user/profile-picture', formData);
  }

  async getProfile(): Promise<AppUser> {
    return this.apiClient.get('/user/profile');
  }

  async deleteProfilePicture(): Promise<void> {
    return this.apiClient.delete('/user/profile-picture');
  }

  // ── Added: look up OTHER users directly from Firestore ──────────────────
  // Reads the same `users` collection AuthService writes to, via the
  // Firebase client SDK — same pattern as AuthService.ts, no custom backend
  // endpoint needed.

  async getUserById(userId: string): Promise<AppUser | null> {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return null;
    return mapUserDoc(snap.id, snap.data());
  }

  // CAVEAT: `handle` is never actually stored on the Firestore doc — it's
  // derived from displayName at read time (see AuthService.toAppUser). So
  // there's nothing reliable to query by yet. This queries by displayName
  // instead, matching what your current UI already passes around
  // (onUserClick(post.user.name), the mock data keyed by name, etc).
  // Two users with the same display name will collide — worth switching
  // call sites to pass the uid instead once that's convenient.
  async getUserByName(name: string): Promise<AppUser | null> {
    const q = query(collection(db, 'users'), where('displayName', '==', name), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return mapUserDoc(docSnap.id, docSnap.data());
  }
}

export const userService = UserService.getInstance();
