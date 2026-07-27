// ── User Database Model ──────────────────────────────────────────────────────
// Database schema and model for Users table
// Use with your preferred ORM (Prisma, TypeORM, Sequelize, etc.)

export interface UserModel {
  id: string; // UUID primary key
  email: string; // Unique, indexed
  passwordHash: string; // bcrypt hash
  role: 'user' | 'tipster' | 'admin';
  subscriptionStatus: 'free' | 'premium';
  tokenVersion: number; // For token invalidation
  emailVerified: boolean;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  acceptedAt?: string;
  policyVersion?: string;
  name: string;
  handle: string;
  profilePicture?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Database schema (SQL)
export const USER_SCHEMA = `
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'tipster', 'admin') NOT NULL DEFAULT 'user',
  subscription_status ENUM('free', 'premium') NOT NULL DEFAULT 'free',
  token_version INTEGER NOT NULL DEFAULT 1,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  policy_version TEXT,
  name VARCHAR(255) NOT NULL,
  handle VARCHAR(255) NOT NULL,
  profile_picture TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_subscription ON users(subscription_status);
`;

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const usersTable: UserModel[] = [];

// Seed test users
const seedUsers = () => {
  const passwordHash = bcrypt.hashSync('password123', 10);
  
  // Regular User
  usersTable.push({
    id: 'user-uuid-1111-2222',
    email: 'user@arena.com',
    passwordHash,
    role: 'user',
    subscriptionStatus: 'free',
    tokenVersion: 1,
    emailVerified: true,
    name: 'Arena Fan',
    handle: '@arenafan',
    profilePicture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    bio: 'Sports fan. Love predictions and good vibes.',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Tipster User
  usersTable.push({
    id: 'tipster-uuid-1111-2222',
    email: 'tipster@arena.com',
    passwordHash,
    role: 'tipster',
    subscriptionStatus: 'premium',
    tokenVersion: 1,
    emailVerified: true,
    name: 'Gold Tipster',
    handle: '@goldtipster',
    profilePicture: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    bio: 'Professional football analyst. 5+ years experience.',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Admin User
  usersTable.push({
    id: 'admin-uuid-1111-2222',
    email: 'admin@arena.com',
    passwordHash,
    role: 'admin',
    subscriptionStatus: 'premium',
    tokenVersion: 1,
    emailVerified: true,
    name: 'Arena Admin',
    handle: '@arenaadmin',
    createdAt: new Date(),
    updatedAt: new Date()
  });
};

seedUsers();

export class User {
  static async findById(id: string): Promise<UserModel | null> {
    const user = usersTable.find(u => u.id === id);
    return user ? { ...user } : null;
  }

  static async findByEmail(email: string): Promise<UserModel | null> {
    const user = usersTable.find(u => u.email.toLowerCase() === email.toLowerCase());
    return user ? { ...user } : null;
  }

  static async create(data: Omit<UserModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserModel> {
    const newUser: UserModel = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    usersTable.push(newUser);
    return { ...newUser };
  }

  static async updateById(id: string, data: Partial<UserModel>): Promise<UserModel> {
    const index = usersTable.findIndex(u => u.id === id);
    if (index === -1) {
      throw new Error(`User with ID ${id} not found`);
    }
    const updatedUser = {
      ...usersTable[index],
      ...data,
      updatedAt: new Date()
    };
    usersTable[index] = updatedUser;
    return { ...updatedUser };
  }

  static async incrementTokenVersion(id: string): Promise<void> {
    const index = usersTable.findIndex(u => u.id === id);
    if (index !== -1) {
      usersTable[index].tokenVersion += 1;
      usersTable[index].updatedAt = new Date();
    }
  }
}