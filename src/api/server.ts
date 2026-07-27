// ── Express Server Setup ─────────────────────────────────────────────────────
// Node.js/Express server with in-memory state and RBAC authentication

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  authenticateToken,
  requirePermission,
  requireRole,
  errorHandler
} from '../middleware/guards/PermissionMiddleware';
import { User } from '../../database/models/User';
import { TipsterProfile } from '../../database/models/TipsterProfile';
import type { PlatformPricing } from '../config/platformPricing';
import { DEFAULT_PLATFORM_PRICING } from '../config/platformPricing';

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-secret-key-change-in-production';
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// ── In-Memory Database Tables ────────────────────────────────────────────────

// Predictions
interface Prediction {
  id: string;
  tipsterId: string;
  tipsterName: string;
  tipsterHandle: string;
  match: string;
  prediction: string;
  odds: number;
  isPremium: boolean;
  price?: number;
  reasoning?: string;
  status: 'pending' | 'win' | 'lost';
  createdAt: Date;
}

const predictionsTable: Prediction[] = [
  {
    id: 'pred_1',
    tipsterId: 'tipster-uuid-1111-2222',
    tipsterName: 'Gold Tipster',
    tipsterHandle: '@goldtipster',
    match: 'Real Madrid vs Barcelona',
    prediction: 'Real Madrid to win',
    odds: 1.95,
    isPremium: false,
    status: 'win',
    createdAt: new Date(Date.now() - 3600000 * 2)
  },
  {
    id: 'pred_2',
    tipsterId: 'tipster-uuid-1111-2222',
    tipsterName: 'Gold Tipster',
    tipsterHandle: '@goldtipster',
    match: 'Arsenal vs Chelsea',
    prediction: 'Over 2.5 Goals',
    odds: 1.80,
    isPremium: true,
    price: 4.99,
    reasoning: 'Both teams have high-scoring recent histories and key defensive players out due to injuries.',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 24)
  }
];

// Wallet Balance & Transactions
interface Transaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  desc: string;
  amount: number;
  time: string;
  status: 'success' | 'pending' | 'failed';
}

const transactionsTable: Transaction[] = [
  { id: 't1', userId: 'user-uuid-1111-2222', type: 'credit', desc: 'Deposit via Card', amount: 5000, time: '2h ago', status: 'success' },
  { id: 't2', userId: 'user-uuid-1111-2222', type: 'debit', desc: 'GoldTips VIP Subscription', amount: 2500, time: '1d ago', status: 'success' },
  { id: 't3', userId: 'user-uuid-1111-2222', type: 'credit', desc: 'Referral Bonus', amount: 1000, time: '2d ago', status: 'success' },
];

const balancesTable: Record<string, number> = {
  'user-uuid-1111-2222': 4500,
  'tipster-uuid-1111-2222': 31000000
};

// Notifications
interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'repost' | 'follow' | 'match' | 'prediction';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const notificationsTable: Notification[] = [
  { id: 'n1', userId: 'user-uuid-1111-2222', type: 'prediction', title: 'New Prediction Alert', body: 'Gold Tipster posted a premium prediction for Arsenal vs Chelsea.', time: '3h ago', read: false },
  { id: 'n2', userId: 'user-uuid-1111-2222', type: 'follow', title: 'New Follower', body: 'Sarah started following you.', time: '1d ago', read: true }
];

// Chat Messages
interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: Date;
}

const messagesTable: Message[] = [];

// Followers relation (userId -> Set of followed tipster userIds)
const followersRelation: Record<string, Set<string>> = {
  'user-uuid-1111-2222': new Set(['tipster-uuid-1111-2222'])
};

// Helper: safe user response mapper
const safeUserResponse = (user: any) => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

// ── Authentication Routes ────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({ ...safeUserResponse(user), token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      role = 'user',
      termsAccepted,
      privacyAccepted,
      acceptedAt,
      policyVersion,
    } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' });
    }

    if (!termsAccepted || !privacyAccepted) {
      return res.status(400).json({ error: 'Terms and privacy acceptance required' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const handle = `@${email.split('@')[0].toLowerCase()}`;

    const user = await User.create({
      email,
      passwordHash,
      role,
      subscriptionStatus: 'free',
      tokenVersion: 1,
      emailVerified: false,
      name,
      handle,
      termsAccepted: Boolean(termsAccepted),
      privacyAccepted: Boolean(privacyAccepted),
      acceptedAt: acceptedAt || new Date().toISOString(),
      policyVersion: policyVersion || 'v1.0',
    });

    if (role === 'tipster') {
      await TipsterProfile.create({
        userId: user.id,
        bio: '',
        winRate: 0,
        followers: 0,
        premiumPrice: null,
        verifiedStatus: false,
        totalPredictions: 0,
        successfulPredictions: 0,
        streak: 0,
        rating: 0
      });
    }

    const token = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({ ...safeUserResponse(user), token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    if (req.user) {
      await User.incrementTokenVersion(req.user.id);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.post('/api/auth/refresh', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = jwt.sign(
      { userId: req.user.id, tokenVersion: req.user.tokenVersion },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({ ...safeUserResponse(req.user), token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  res.json(safeUserResponse(req.user));
});

// ── User Profile Endpoints ───────────────────────────────────────────────────

// GET profile (accepts both formats)
const getProfileHandler = async (req: express.Request, res: express.Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  res.json(safeUserResponse(req.user));
};

app.get('/api/user/profile', authenticateToken, getProfileHandler);
app.get('/api/users/profile', authenticateToken, getProfileHandler);

// UPDATE profile (accepts both formats)
const updateProfileHandler = async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { name, bio } = req.body;
    const updated = await User.updateById(req.user.id, {
      name: name || req.user.name,
      bio: bio || req.user.bio
    });
    res.json(safeUserResponse(updated));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

app.put('/api/user/profile', authenticateToken, updateProfileHandler);
app.put('/api/users/update', authenticateToken, updateProfileHandler);

// PROFILE PICTURE endpoints
app.post('/api/user/profile-picture', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Mock picture upload by returning a stock photo URL
    const mockPhotoUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
    const updated = await User.updateById(req.user.id, { profilePicture: mockPhotoUrl });
    res.json(safeUserResponse(updated));
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

app.delete('/api/user/profile-picture', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const updated = await User.updateById(req.user.id, { profilePicture: undefined });
    res.json(safeUserResponse(updated));
  } catch (error) {
    console.error('Profile picture delete error:', error);
    res.status(500).json({ error: 'Failed to delete profile picture' });
  }
});

// ── Tipster Profile Endpoints ─────────────────────────────────────────────────

// CREATE a new tipster profile (e.g. Become Tipster workflow)
app.post('/api/tipster/create', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { bio, experience, channelName, price } = req.body;

    // Elevate user's role to tipster
    const updatedUser = await User.updateById(req.user.id, { role: 'tipster' });

    // Create the tipster profile
    const profile = await TipsterProfile.updateByUserId(req.user.id, {
      bio: bio || `Welcome to ${channelName || updatedUser.name}'s channel. Experienced in sports analysis.`,
      winRate: 65, // starts with initial mock winRate
      followers: 0,
      premiumPrice: price ? parseFloat(price) : null,
      verifiedStatus: false,
      totalPredictions: 0,
      successfulPredictions: 0,
      streak: 0,
      rating: 4.0
    });

    res.json({
      success: true,
      data: {
        ...profile,
        id: profile.userId
      }
    });
  } catch (error) {
    console.error('Become tipster error:', error);
    res.status(500).json({ error: 'Failed to create tipster profile' });
  }
});

// GET current user's tipster profile
app.get('/api/tipster/profile', authenticateToken, requirePermission('view_profile'), async (req, res) => {
  try {
    const profile = await TipsterProfile.findByUserId(req.user!.id);
    res.json({ data: profile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tipster profile' });
  }
});

app.get('/api/tipsters/profile', authenticateToken, requirePermission('view_profile'), async (req, res) => {
  try {
    const userId = req.query.userId as string || req.user!.id;
    const profile = await TipsterProfile.findByUserId(userId);
    res.json({ data: profile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tipster profile' });
  }
});

// UPDATE current user's tipster profile
app.put('/api/tipster/profile', authenticateToken, requirePermission('create_predictions'), async (req, res) => {
  try {
    const { bio, premiumPrice } = req.body;
    const profile = await TipsterProfile.updateByUserId(req.user!.id, {
      bio,
      premiumPrice: premiumPrice ? parseFloat(premiumPrice) : undefined
    });
    res.json({ data: profile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tipster profile' });
  }
});

// GET tipster profile by userId
app.get('/api/tipster/user/:userId', authenticateToken, async (req, res) => {
  try {
    const profile = await TipsterProfile.findByUserId(req.params.userId);
    res.json({ data: profile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tipster profile' });
  }
});

// SEARCH tipsters
app.get('/api/tipster/search', authenticateToken, async (req, res) => {
  try {
    const query = (req.query.q as string || '').toLowerCase();
    const profiles = await TipsterProfile.getTopTipsters(50);
    
    // Enrich profile with user name/handle for search query matching
    const enriched = await Promise.all(profiles.map(async p => {
      const u = await User.findById(p.userId);
      return { ...p, user: u };
    }));

    const filtered = enriched.filter(item => 
      item.user?.name.toLowerCase().includes(query) || 
      item.user?.handle.toLowerCase().includes(query) ||
      item.bio.toLowerCase().includes(query)
    ).map(({ user: _, ...p }) => p);

    res.json({ data: filtered });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET top tipsters
app.get('/api/tipster/top', authenticateToken, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const profiles = await TipsterProfile.getTopTipsters(limit);
    res.json({ data: profiles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get top tipsters' });
  }
});

// FOLLOW / UNFOLLOW tipsters
app.post('/api/tipster/:tipsterId/follow', authenticateToken, async (req, res) => {
  try {
    const { tipsterId } = req.params;
    const myId = req.user!.id;

    if (!followersRelation[myId]) {
      followersRelation[myId] = new Set();
    }
    
    if (!followersRelation[myId].has(tipsterId)) {
      followersRelation[myId].add(tipsterId);
      await TipsterProfile.incrementFollowers(tipsterId);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Follow failed' });
  }
});

app.post('/api/tipster/:tipsterId/unfollow', authenticateToken, async (req, res) => {
  try {
    const { tipsterId } = req.params;
    const myId = req.user!.id;

    if (followersRelation[myId] && followersRelation[myId].has(tipsterId)) {
      followersRelation[myId].delete(tipsterId);
      await TipsterProfile.decrementFollowers(tipsterId);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Unfollow failed' });
  }
});

// ── Predictions Endpoints ────────────────────────────────────────────────────

app.get('/api/predictions', authenticateToken, requirePermission('view_predictions'), async (req, res) => {
  try {
    res.json(predictionsTable);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

app.post('/api/predictions', authenticateToken, requirePermission('create_predictions'), async (req, res) => {
  try {
    const { match, prediction, odds, isPremium, price, reasoning } = req.body;

    if (!match || !prediction || !odds) {
      return res.status(400).json({ error: 'Match, prediction, and odds are required' });
    }

    const newPrediction: Prediction = {
      id: 'pred_' + Date.now(),
      tipsterId: req.user!.id,
      tipsterName: req.user!.name,
      tipsterHandle: req.user!.handle,
      match,
      prediction,
      odds: parseFloat(odds),
      isPremium: !!isPremium,
      price: price ? parseFloat(price) : undefined,
      reasoning,
      status: 'pending',
      createdAt: new Date()
    };

    predictionsTable.unshift(newPrediction);

    // Update stats for tipster
    await TipsterProfile.updateByUserId(req.user!.id, {}); // Touch profile to ensure stats sync/exist
    
    res.json(newPrediction);
  } catch (error) {
    console.error('Create prediction error:', error);
    res.status(500).json({ error: 'Failed to create prediction' });
  }
});

// ── Wallet Endpoints ──────────────────────────────────────────────────────────

app.get('/api/wallet/balance', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const balance = balancesTable[userId] || 0;
  res.json({ balance });
});

app.post('/api/wallet/deposit', authenticateToken, async (req, res) => {
  try {
    const { amount, method } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    const userId = req.user!.id;
    balancesTable[userId] = (balancesTable[userId] || 0) + Number(amount);

    const newTx: Transaction = {
      id: 'tx_' + Date.now(),
      userId,
      type: 'credit',
      desc: `Deposit via ${method || 'Card'}`,
      amount: Number(amount),
      time: 'Just now',
      status: 'success'
    };

    transactionsTable.unshift(newTx);
    res.json({ success: true, balance: balancesTable[userId], transaction: newTx });
  } catch (error) {
    res.status(500).json({ error: 'Deposit failed' });
  }
});

app.post('/api/wallet/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, bankName, accountNumber } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    const userId = req.user!.id;
    const balance = balancesTable[userId] || 0;
    if (balance < amount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    balancesTable[userId] = balance - Number(amount);

    const newTx: Transaction = {
      id: 'tx_' + Date.now(),
      userId,
      type: 'debit',
      desc: `Withdrawal to ${bankName || 'Bank'} (${accountNumber || '****'})`,
      amount: Number(amount),
      time: 'Just now',
      status: 'success'
    };

    transactionsTable.unshift(newTx);
    res.json({ success: true, balance: balancesTable[userId], transaction: newTx });
  } catch (error) {
    res.status(500).json({ error: 'Withdrawal failed' });
  }
});

app.get('/api/wallet/history', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const userTxs = transactionsTable.filter(t => t.userId === userId);
  res.json(userTxs);
});

// ── Notifications Endpoints ──────────────────────────────────────────────────

app.get('/api/notifications', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const userNotifications = notificationsTable.filter(n => n.userId === userId);
  res.json(userNotifications);
});

// ── Message Chat Endpoints ───────────────────────────────────────────────────

app.get('/api/messages', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const chats = messagesTable.filter(m => m.senderId === userId || m.recipientId === userId);
  res.json(chats);
});

app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { recipientId, text } = req.body;
    if (!recipientId || !text) {
      return res.status(400).json({ error: 'Recipient and text are required' });
    }

    const newMsg: Message = {
      id: 'msg_' + Date.now(),
      senderId: req.user!.id,
      recipientId,
      text,
      timestamp: new Date()
    };

    messagesTable.push(newMsg);
    res.json(newMsg);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ── Admin Routes ─────────────────────────────────────────────────────────────

let platformPricingStore: PlatformPricing = { ...DEFAULT_PLATFORM_PRICING };

app.get('/api/platform/pricing', (_req, res) => {
  res.json({ data: platformPricingStore });
});

app.get('/api/admin/platform-pricing', authenticateToken, requireRole(['admin']), (_req, res) => {
  res.json({ data: platformPricingStore });
});

app.put('/api/admin/platform-pricing', authenticateToken, requireRole(['admin']), (req, res) => {
  const {
    tipsterRegistrationFeeNgn,
    subscriptionCommissionPercent,
    predictionCommissionPercent,
    payoutProcessingFeePercent,
    minChannelPriceNgn,
    maxChannelPriceNgn,
    defaultChannelPriceNgn,
  } = req.body;

  platformPricingStore = {
    ...platformPricingStore,
    ...(tipsterRegistrationFeeNgn !== undefined && { tipsterRegistrationFeeNgn: Number(tipsterRegistrationFeeNgn) }),
    ...(subscriptionCommissionPercent !== undefined && { subscriptionCommissionPercent: Number(subscriptionCommissionPercent) }),
    ...(predictionCommissionPercent !== undefined && { predictionCommissionPercent: Number(predictionCommissionPercent) }),
    ...(payoutProcessingFeePercent !== undefined && { payoutProcessingFeePercent: Number(payoutProcessingFeePercent) }),
    ...(minChannelPriceNgn !== undefined && { minChannelPriceNgn: Number(minChannelPriceNgn) }),
    ...(maxChannelPriceNgn !== undefined && { maxChannelPriceNgn: Number(maxChannelPriceNgn) }),
    ...(defaultChannelPriceNgn !== undefined && { defaultChannelPriceNgn: Number(defaultChannelPriceNgn) }),
    updatedAt: new Date().toISOString(),
  };

  res.json({ data: platformPricingStore });
});

app.get('/api/admin/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Return all seeded users for admin view
    const users = await Promise.all([
      User.findByEmail('user@arena.com'),
      User.findByEmail('tipster@arena.com'),
      User.findByEmail('admin@arena.com')
    ]);
    res.json(users.filter(Boolean).map(safeUserResponse));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// ── Error Handling ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ── 404 Handler ─────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Start Server ────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;