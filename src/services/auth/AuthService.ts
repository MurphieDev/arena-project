// src/services/auth/AuthService.ts
// Real Firebase implementation replacing mock authService

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, serverTimestamp,
  collection, addDoc
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { TempPasswordStorage } from '../storage/TempPasswordStorage';
import type { AppUser } from '../../core/types';

// ── Convert Firebase user → AppUser ───────────────────────────────────────
async function toAppUser(fbUser: FirebaseUser): Promise<AppUser> {
  const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
  const data = userDoc.data() || {};
  return {
    id: fbUser.uid,
    uid: fbUser.uid,
    name: data.displayName || fbUser.displayName || 'User',
    displayName: data.displayName || fbUser.displayName || 'User',
    email: fbUser.email || '',
    handle: `@${(data.displayName || 'user').toLowerCase().replace(/\s/g, '')}`,
    role: data.role || 'user',
    verified: data.verified || false,
    profilePicture: data.profilePicture || fbUser.photoURL || undefined,
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

// ── AuthService ────────────────────────────────────────────────────────────
export const authService = {
  // Get current user from Firebase
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  // Refresh token and return AppUser
  async refreshToken(): Promise<AppUser | null> {
    const fbUser = auth.currentUser;
    if (!fbUser) return null;
    await fbUser.reload();
    return toAppUser(fbUser);
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: AppUser | null) => void) {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const appUser = await toAppUser(fbUser);
        callback(appUser);
      } else {
        callback(null);
      }
    });
  },

  // Login
  async login(email: string, password: string): Promise<AppUser> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return toAppUser(result.user);
  },

  // Sign up
  async signup(
    email: string,
    password: string,
    name: string,
    role: 'user' | 'tipster' = 'user',
    termsAccepted = true,
    privacyAccepted = true,
    policyVersion = 'v1.0',
    extra?: Record<string, any>
  ): Promise<AppUser> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const uid = result.user.uid;

    await setDoc(doc(db, 'users', uid), {
      displayName: name.trim(),
      email,
      role,
      verified: false,
      walletBalance: 0,
      winRate: 0,
      tipsCount: 0,
      followersCount: 0,
      followingCount: 0,
      paidChannelEligible: false,
      termsAccepted,
      privacyAccepted,
      policyVersion,
      ...(extra || {}),
      createdAt: serverTimestamp(),
    });

    // Send welcome notification
    await addDoc(collection(db, 'notifications'), {
      userId: uid,
      type: 'welcome',
      title: 'Welcome to Arena! 🎉',
      message: 'Your account is ready. Explore tipsters, follow channels and start winning!',
      read: false,
      createdAt: serverTimestamp(),
    });

    // Send email verification
    await sendEmailVerification(result.user);

    return toAppUser(result.user);
  },

  // Google sign in
  async loginWithGoogle(): Promise<AppUser> {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const uid = result.user.uid;

    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', uid), {
        displayName: result.user.displayName || 'User',
        email: result.user.email || '',
        role: 'user',
        verified: false,
        walletBalance: 0,
        winRate: 0,
        tipsCount: 0,
        followersCount: 0,
        followingCount: 0,
        paidChannelEligible: false,
        profilePicture: result.user.photoURL || '',
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'notifications'), {
        userId: uid,
        type: 'welcome',
        title: 'Welcome to Arena! 🎉',
        message: 'Your account is ready. Explore tipsters, follow channels and start winning!',
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    return toAppUser(result.user);
  },

  // Request OTP — validates credentials then stores them
  async requestOTP(email: string, password: string): Promise<{ requiresOtp: true; email: string }> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Store credentials for OTP page
    TempPasswordStorage.setTempPassword(email, password);
    // Send verification email if not verified
    if (!result.user.emailVerified) {
      await sendEmailVerification(result.user);
    }
    // Sign out temporarily
    await signOut(auth);
    return { requiresOtp: true, email };
  },

  // Reset password
  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  // Logout
  async logout(): Promise<void> {
    TempPasswordStorage.clearTempPassword();
    await signOut(auth);
  },
};
