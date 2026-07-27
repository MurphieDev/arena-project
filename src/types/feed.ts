// ── Feed Types ────────────────────────────────────────────────

export type CardType = 'prediction' | 'analysis' | 'video' | 'live-match' | 'tipster' | 'trending' | 'user' | 'ad';

export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
  tipster: boolean;
  followers?: number;
}

export interface Match {
  id: string;
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  league: string;
  status: 'upcoming' | 'live' | 'finished';
  startTime: string;
  odds?: {
    home: number;
    draw: number;
    away: number;
  };
}

export interface PredictionCard {
  id: string;
  type: 'prediction';
  user: User;
  match: Match;
  prediction: string;
  odds: number;
  potentialReturn: number;
  confidence: number;
  likes: number;
  comments?: number;
  reposts?: number;
  views?: number;
  timestamp: string;
  liked?: boolean;
  bookmarked?: boolean;
}

export interface AnalysisCard {
  id: string;
  type: 'analysis';
  user: User;
  match?: Match;
  title: string;
  content: string;
  image?: string;
  keyPoints?: string[];
  confidence: number;
  winRate: number;
  roi: number;
  tags?: string[];
  likes: number;
  comments?: number;
  reposts?: number;
  views?: number;
  timestamp: string;
  liked?: boolean;
  bookmarked?: boolean;
}

export interface VideoCard {
  id: string;
  type: 'video';
  user: User;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  match?: Match;
  likes: number;
  comments?: number;
  shares?: number;
  views?: number;
  timestamp: string;
  liked?: boolean;
  bookmarked?: boolean;
  isLive?: boolean;
}

export interface LiveMatchCard {
  id: string;
  type: 'live-match';
  match: Match;
  status: 'LIVE' | 'UPCOMING' | 'FINISHED';
  timeElapsed?: number;
  liveCommentary?: Array<{
    minute: number;
    text: string;
  }>;
  keyMoments?: string[];
  viewers?: number;
  predictorsTaking?: number;
  topPredictions?: string[];
  stats?: Record<string, { home: number; away: number }>;
  likes?: number;
  comments?: number;
  reposts?: number;
}

export interface TrendingCard {
  id: string;
  type: 'trending';
  tag: string;
  title?: string;
  description: string;
  category: string;
  rank: number;
  postCount?: number;
  mentionCount?: number;
  momentum: number;
  topPosts?: Array<{
    text: string;
    likes: number;
    comments: number;
  }>;
  relatedTopics?: string[];
  image?: string;
  likes?: number;
  comments?: number;
  views?: number;
}

export interface UserCard {
  id: string;
  type: 'user';
  user: User;
  bio?: string;
  postCount: number;
  followingCount: number;
  performance?: Record<string, string>;
  recentActivity?: string[];
  badges?: string[];
  likes?: number;
  comments?: number;
  following?: boolean;
}

export interface AdCard {
  id: string;
  type: 'ad';
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
}

export type FeedCard = PredictionCard | AnalysisCard | VideoCard | LiveMatchCard | TrendingCard | UserCard | AdCard;

export interface FeedState {
  cards: FeedCard[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  page: number;
  activeVideoId: string | null;
}

export interface FeedOptions {
  limit?: number;
  offset?: number;
  filter?: CardType[];
  sort?: 'trending' | 'new' | 'following';
}
