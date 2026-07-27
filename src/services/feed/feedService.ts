import type { FeedCard, PredictionCard, AnalysisCard, VideoCard, LiveMatchCard, TrendingCard, UserCard, User, Match } from '../../types/feed';

// Mock user data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Pulse',
    handle: '@johnpulse',
    avatar: '🟢',
    verified: true,
    tipster: true,
    followers: 45200,
  },
  {
    id: '2',
    name: 'Sarah Kicks',
    handle: '@sarahkicks',
    avatar: '🔴',
    verified: false,
    tipster: false,
    followers: 12300,
  },
  {
    id: '3',
    name: 'NBA Central',
    handle: '@nbacentral',
    avatar: '🟣',
    verified: true,
    tipster: true,
    followers: 128900,
  },
  {
    id: '4',
    name: 'Goal Alert',
    handle: '@goalalert',
    avatar: '⚪',
    verified: true,
    tipster: false,
    followers: 89200,
  },
];

// Mock match data
const mockMatches: Match[] = [
  {
    id: '1',
    home: 'Man City',
    away: 'Arsenal',
    homeScore: 2,
    awayScore: 1,
    league: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League',
    status: 'live',
    startTime: '2024-05-26T15:00:00Z',
    odds: { home: 1.8, draw: 3.6, away: 4.2 },
  },
  {
    id: '2',
    home: 'Real Madrid',
    away: 'Barcelona',
    homeScore: 3,
    awayScore: 2,
    league: '🇪🇸 La Liga',
    status: 'live',
    startTime: '2024-05-26T16:00:00Z',
    odds: { home: 1.9, draw: 3.4, away: 3.9 },
  },
  {
    id: '3',
    home: 'Lakers',
    away: 'Warriors',
    homeScore: 89,
    awayScore: 84,
    league: '🏀 NBA',
    status: 'live',
    startTime: '2024-05-26T14:00:00Z',
    odds: { home: 1.95, draw: 2.0, away: 1.95 },
  },
];

const uiLayoutSummary = 'Primary sidebar → secondary chat list → main chat pane: fixed navigation, searchable conversation directory, scrollable message feed, and a fixed bottom input bar. The hierarchy is left-to-right, with a fixed header/footer and mobile-first Tailwind structure to resolve overlap and nested scrolling.';

// Mock prediction cards
function generatePredictionCard(index: number): PredictionCard {
  return {
    id: `pred-${index}`,
    type: 'prediction',
    user: mockUsers[index % mockUsers.length],
    match: mockMatches[index % mockMatches.length],
    prediction: uiLayoutSummary,
    odds: 1.8 + (index % 5) * 0.2,
    potentialReturn: 100 + index * 50,
    confidence: 75 + (index % 20),
    likes: 234 + index * 10,
    comments: 45 + index * 3,
    reposts: 12 + index,
    views: 1200 + index * 50,
    timestamp: new Date(Date.now() - index * 600000).toISOString(),
    liked: false,
    bookmarked: false,
  };
}

// Mock analysis cards
function generateAnalysisCard(index: number): AnalysisCard {
  return {
    id: `analysis-${index}`,
    type: 'analysis',
    user: mockUsers[(index + 1) % mockUsers.length],
    title: `Deep Analysis: ${mockMatches[index % mockMatches.length].home} vs ${mockMatches[index % mockMatches.length].away}`,
    content:
      'Looking at team form, defensive injuries, and recent head-to-head records. The stats suggest a strong performance...',
    image: '📊',
    keyPoints: ['Strong recent form', 'Key player availability', 'Tactical advantages', 'Weather conditions'],
    confidence: 82 + (index % 15),
    winRate: 68 + (index % 20),
    roi: 12 + (index % 10),
    tags: ['#football', '#analysis', '#prediction'],
    likes: 567 + index * 20,
    comments: 89 + index * 5,
    reposts: 34 + index * 2,
    views: 3400 + index * 100,
    timestamp: new Date(Date.now() - index * 1200000).toISOString(),
    liked: false,
    bookmarked: false,
  };
}

// Mock video cards
function generateVideoCard(index: number): VideoCard {
  return {
    id: `video-${index}`,
    type: 'video',
    user: mockUsers[index % mockUsers.length],
    title: `Match Highlights & Analysis - Ep ${index + 1}`,
    description: 'Full match analysis with key moments and prediction insights for this weekend\'s top fixtures.',
    videoUrl: `https://example.com/video-${index}.mp4`,
    thumbnailUrl: `https://via.placeholder.com/320x180?text=Video+${index}`,
    duration: 420 + index * 60,
    match: mockMatches[index % mockMatches.length],
    likes: 890 + index * 30,
    comments: 156 + index * 8,
    shares: 67 + index * 3,
    views: 5600 + index * 200,
    timestamp: new Date(Date.now() - index * 3600000).toISOString(),
    liked: false,
    bookmarked: false,
    isLive: index % 3 === 0,
  };
}

// Mock live match cards
function generateLiveMatchCard(index: number): LiveMatchCard {
  return {
    id: `live-${index}`,
    type: 'live-match',
    match: mockMatches[index % mockMatches.length],
    status: 'LIVE',
    timeElapsed: 45 + (index % 30),
    liveCommentary: [
      { minute: 42, text: 'Great chance for the home team!' },
      { minute: 40, text: 'Yellow card shown' },
      { minute: 35, text: 'Goal! Score is now 1-0' },
    ],
    keyMoments: ['45\' - Goal!', '52\' - Yellow Card', '67\' - Substitution'],
    viewers: 45230 + index * 1000,
    predictorsTaking: 2340 + index * 100,
    topPredictions: ['Over 2.5 Goals (67%)', 'Both Teams Score (54%)', 'Home Win (61%)'],
    stats: {
      'Possession': { home: 58, away: 42 },
      'Shots': { home: 12, away: 8 },
      'Fouls': { home: 6, away: 8 },
    },
    likes: 1234 + index * 50,
    comments: 89 + index * 5,
  };
}

// Mock trending cards
function generateTrendingCard(index: number): TrendingCard {
  const trends = [
    'ChampionsLeague',
    'TransferRumors',
    'FantasyFootball',
    'InjuryUpdates',
    'RefereeFails',
  ];

  return {
    id: `trending-${index}`,
    type: 'trending',
    tag: trends[index % trends.length],
    description: 'Join thousands of users discussing the hottest sports topics right now.',
    category: ['football', 'basketball', 'sports'][index % 3],
    rank: index + 1,
    postCount: 12300 + index * 500,
    mentionCount: 8900 + index * 300,
    momentum: 23 + (index % 50),
    topPosts: [
      { text: 'Amazing performance from the team today!', likes: 234, comments: 45 },
      { text: 'What an incredible match! Best predictions are here.', likes: 567, comments: 89 },
    ],
    relatedTopics: ['football', 'predictions', 'analysis'],
    likes: 123 + index * 10,
    comments: 45 + index * 3,
  };
}

// Mock user recommendation cards
function generateUserCard(index: number): UserCard {
  const user = mockUsers[index % mockUsers.length];
  return {
    id: `user-${index}`,
    type: 'user',
    user,
    bio: 'Professional tipster with 5+ years of sports prediction experience. Follow for daily insights.',
    postCount: 1240 + index * 50,
    followingCount: 342 + index * 20,
    performance: {
      'Accuracy': '78%',
      'ROI': '+12.5%',
      'Streak': '7W-2L',
    },
    recentActivity: [
      '3 new predictions today',
      'Won 5 consecutive bets',
      'Trending prediction',
    ],
    badges: ['Verified', 'Pro Tipster', 'Hot Streak'],
    likes: 456 + index * 20,
    comments: 78 + index * 5,
    following: false,
  };
}

// Combined mock data generator
function generateMockCards(limit: number, offset: number, filter?: string[]): FeedCard[] {
  const cards: FeedCard[] = [];
  const cardTypes = filter && filter.length > 0 ? filter : ['prediction', 'analysis', 'video', 'live-match', 'trending', 'user'];

  for (let i = 0; i < limit; i++) {
    const index = offset + i;
    const cardType = cardTypes[index % cardTypes.length];

    switch (cardType) {
      case 'prediction':
        cards.push(generatePredictionCard(index));
        break;
      case 'analysis':
        cards.push(generateAnalysisCard(index));
        break;
      case 'video':
        cards.push(generateVideoCard(index));
        break;
      case 'live-match':
        cards.push(generateLiveMatchCard(index));
        break;
      case 'trending':
        cards.push(generateTrendingCard(index));
        break;
      case 'user':
        cards.push(generateUserCard(index));
        break;
    }
  }

  return cards;
}

// API service
export async function fetchFeedCards(
  options: { limit?: number; offset?: number; filter?: string[]; sort?: string },
  _signal?: AbortSignal
): Promise<FeedCard[]> {
  const { limit = 10, offset = 0, filter } = options;

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Cap at 30 items so scroll stops at the bottom
  const MAX_ITEMS = 30;
  if (offset >= MAX_ITEMS) return [];
  const safeLimit = Math.min(limit, MAX_ITEMS - offset);

  return generateMockCards(safeLimit, offset, filter);
}

// Get single card details
export async function getCardDetails(_cardId: string): Promise<FeedCard | null> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return generateMockCards(1, Math.random() * 100)[0];
}

// Like card
export async function likeCard(_cardId: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return true;
}

// Bookmark card
export async function bookmarkCard(_cardId: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return true;
}

// Share card
export async function shareCard(_cardId: string, _platform: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return true;
}