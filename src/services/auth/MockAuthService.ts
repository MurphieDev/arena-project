// ── Mock Authentication Service ──────────────────────────────────────────────
// For development/testing when backend is not available
// Replace with real AuthService when backend is implemented

import type { AppUser } from '../../core/types';
import { ROLE_PERMISSIONS } from '../../core/types';
import { TempPasswordStorage } from '../storage/TempPasswordStorage';


export class MockAuthService {
  private static instance: MockAuthService;
  private currentUser: AppUser | null = null;

  // Mock user database
  private mockUsers: Record<string, { password: string; user: AppUser }> = {
    'user@example.com': {
      password: 'user123',
      user: {
        id: '1',
        name: 'John User',
        handle: '@johnuser',
        email: 'user@example.com',
        role: 'user',
        subscriptionStatus: 'free',
        createdAt: '2024-01-01T00:00:00Z',
      },
    },
    'tipster@example.com': {
      password: 'tipster123',
      user: {
        id: '2',
        name: 'Sarah Tipster',
        handle: '@sarahtipster',
        email: 'tipster@example.com',
        role: 'tipster',
        subscriptionStatus: 'premium',
        createdAt: '2024-01-01T00:00:00Z',
      },
    },
    'admin@example.com': {
      password: 'admin123',
      user: {
        id: '3',
        name: 'Admin User',
        handle: '@admin',
        email: 'admin@example.com',
        role: 'admin',
        subscriptionStatus: 'premium',
        createdAt: '2024-01-01T00:00:00Z',
      },
    },
  };

  private constructor() {}

  static getInstance(): MockAuthService {
    if (!MockAuthService.instance) {
      MockAuthService.instance = new MockAuthService();
    }
    return MockAuthService.instance;
  }

  async login(email: string, password: string): Promise<AppUser> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockUser = this.mockUsers[email];
    if (!mockUser || mockUser.password !== password) {
      throw new Error('Invalid email or password');
    }

    this.currentUser = mockUser.user;
    localStorage.setItem('user', JSON.stringify(mockUser.user));
    return mockUser.user;
  }

  async logout(): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    this.currentUser = null;
    localStorage.removeItem('user');
  }

  async refreshToken(): Promise<AppUser | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      } catch {
        localStorage.removeItem('user');
      }
    }
    return null;
  }

  getCurrentUser(): AppUser | null {
    if (this.currentUser) {
      return this.currentUser;
    }

    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      } catch {
        localStorage.removeItem('user');
      }
    }

    return null;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    return ROLE_PERMISSIONS[user.role].includes(permission);
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  // Mock signup for tipster registration
  async signup(
    email: string,
    password: string,
    name: string,
    role: 'user' | 'tipster' = 'user',
    termsAccepted = true,
    privacyAccepted = true,
    policyVersion = 'v1.0'
  ): Promise<AppUser> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (this.mockUsers[email]) {
      throw new Error('User already exists');
    }

    const newUser: AppUser = {
      id: Date.now().toString(),
      name,
      handle: `@${name.toLowerCase().replace(/\s+/g, '')}`,
      email,
      role,
      subscriptionStatus: 'free',
      createdAt: new Date().toISOString(),
      termsAccepted,
      privacyAccepted,
      acceptedAt: new Date().toISOString(),
      policyVersion,
    };

    this.mockUsers[email] = { password, user: newUser };
    this.currentUser = newUser;
    localStorage.setItem('user', JSON.stringify(newUser));
    return newUser;
  }

  // Request OTP for 2FA - saves credentials temporarily for OTP verification
  async requestOTP(email: string, password: string): Promise<{ requiresOtp: true; email: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockUser = this.mockUsers[email];
    if (!mockUser || mockUser.password !== password) {
      throw new Error('Invalid email or password');
    }

    // Save temp password for OTP verification flow
    TempPasswordStorage.saveTempPassword(email, password);

    return { requiresOtp: true, email };
  }

}

export const mockAuthService = MockAuthService.getInstance();