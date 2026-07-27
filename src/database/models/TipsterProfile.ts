// ── Tipster Profile Database Model ───────────────────────────────────────────
// Database schema and model for Tipster profiles
// One-to-one relationship with Users table

export interface TipsterProfileModel {
  userId: string; // Foreign key to users.id, primary key
  bio: string;
  winRate: number; // Decimal 0-100
  followers: number;
  premiumPrice: number | null; // Monthly subscription price
  verifiedStatus: boolean;
  totalPredictions: number;
  successfulPredictions: number;
  streak: number; // Current win streak
  rating: number; // Average user rating 1-5
  createdAt: Date;
  updatedAt: Date;
}

// Database schema (SQL)
export const TIPSTER_PROFILE_SCHEMA = `
CREATE TABLE tipster_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  win_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (win_rate >= 0 AND win_rate <= 100),
  followers INTEGER NOT NULL DEFAULT 0,
  premium_price DECIMAL(10,2) NULL CHECK (premium_price > 0),
  verified_status BOOLEAN NOT NULL DEFAULT FALSE,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  successful_predictions INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  rating DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tipster_profiles_verified ON tipster_profiles(verified_status);
CREATE INDEX idx_tipster_profiles_win_rate ON tipster_profiles(win_rate DESC);
CREATE INDEX idx_tipster_profiles_followers ON tipster_profiles(followers DESC);
CREATE INDEX idx_tipster_profiles_rating ON tipster_profiles(rating DESC);
`;

const tipsterProfilesTable: TipsterProfileModel[] = [];

// Seed tipster profile
tipsterProfilesTable.push({
  userId: 'tipster-uuid-1111-2222',
  bio: 'Professional football analyst. 5+ years experience in predicting sports outcomes.',
  winRate: 74,
  followers: 12400,
  premiumPrice: 2500,
  verifiedStatus: true,
  totalPredictions: 45,
  successfulPredictions: 33,
  streak: 8,
  rating: 4.8,
  createdAt: new Date(),
  updatedAt: new Date()
});

export class TipsterProfile {
  static async findByUserId(userId: string): Promise<TipsterProfileModel | null> {
    const profile = tipsterProfilesTable.find(p => p.userId === userId);
    return profile ? { ...profile } : null;
  }

  static async create(data: Omit<TipsterProfileModel, 'createdAt' | 'updatedAt'>): Promise<TipsterProfileModel> {
    const newProfile: TipsterProfileModel = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    tipsterProfilesTable.push(newProfile);
    return { ...newProfile };
  }

  static async updateByUserId(userId: string, data: Partial<TipsterProfileModel>): Promise<TipsterProfileModel> {
    const index = tipsterProfilesTable.findIndex(p => p.userId === userId);
    if (index === -1) {
      const newProfile: TipsterProfileModel = {
        userId,
        bio: data.bio || '',
        winRate: data.winRate || 0,
        followers: data.followers || 0,
        premiumPrice: data.premiumPrice || null,
        verifiedStatus: data.verifiedStatus || false,
        totalPredictions: data.totalPredictions || 0,
        successfulPredictions: data.successfulPredictions || 0,
        streak: data.streak || 0,
        rating: data.rating || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      tipsterProfilesTable.push(newProfile);
      return { ...newProfile };
    }
    const updatedProfile = {
      ...tipsterProfilesTable[index],
      ...data,
      updatedAt: new Date()
    };
    tipsterProfilesTable[index] = updatedProfile;
    return { ...updatedProfile };
  }

  static async incrementFollowers(userId: string): Promise<void> {
    const index = tipsterProfilesTable.findIndex(p => p.userId === userId);
    if (index !== -1) {
      tipsterProfilesTable[index].followers += 1;
      tipsterProfilesTable[index].updatedAt = new Date();
    }
  }

  static async decrementFollowers(userId: string): Promise<void> {
    const index = tipsterProfilesTable.findIndex(p => p.userId === userId);
    if (index !== -1 && tipsterProfilesTable[index].followers > 0) {
      tipsterProfilesTable[index].followers -= 1;
      tipsterProfilesTable[index].updatedAt = new Date();
    }
  }

  static async updateStats(userId: string, won: boolean): Promise<void> {
    const index = tipsterProfilesTable.findIndex(p => p.userId === userId);
    if (index !== -1) {
      const p = tipsterProfilesTable[index];
      p.totalPredictions += 1;
      if (won) {
        p.successfulPredictions += 1;
        p.streak += 1;
      } else {
        p.streak = 0;
      }
      p.winRate = Math.round((p.successfulPredictions / p.totalPredictions) * 100);
      p.updatedAt = new Date();
    }
  }

  static async getTopTipsters(limit: number = 10): Promise<TipsterProfileModel[]> {
    return [...tipsterProfilesTable]
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, limit);
  }
}