import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, Users, Hash, Trophy, X, Zap,
  Newspaper, ExternalLink, Heart, ArrowLeft,
  CheckCircle, UserPlus, UserCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, onSnapshot, doc, setDoc,
  deleteDoc, query as firestoreQuery,
  orderBy, limit, getDocs, getDoc,
  addDoc, serverTimestamp, updateDoc, increment
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── ESPN News (free, no API key needed) ───────────────────────────────────
const NEWS_FEEDS = [
  { label: 'Football', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news?limit=15' },
  { label: 'Basketball', url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=15' },
  { label: 'American Football', url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=15' },
  { label: 'Baseball', url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/news?limit=15' },
  { label: 'Hockey', url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news?limit=15' },
];

// ── Types ──────────────────────────────────────────────────────────────────
interface Tipster {
  id: string;
  displayName: string;
  channelName?: string;
  bio?: string;
  sports?: string[];
  winRate: number;
  followersCount: number;
  tipsCount: number;
  role: string;
  verified?: boolean;
  paidChannelEligible?: boolean;
}

interface NewsArticle {
  id: string;
  headline: string;
  description?: string;
  images?: { url: string }[];
  links?: { web?: { href: string } };
  published: string;
  source?: string;
  categories?: { description: string; type?: string }[];
}

interface Tip {
  id: string;
  tipsterName: string;
  prediction: string;
  sport: string;
  odds: number;
  likesCount: number;
  createdAt: any;
}

const sports = [
  { id: '1', name: 'Football', emoji: '⚽', color: 'bg-green-500/10 border-green-500/20 text-green-400', espnSport: 'soccer', espnLeague: 'eng.1' },
  { id: '2', name: 'Basketball', emoji: '🏀', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400', espnSport: 'basketball', espnLeague: 'nba' },
  { id: '3', name: 'Tennis', emoji: '🎾', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400', espnSport: 'tennis', espnLeague: 'atp' },
  { id: '4', name: 'F1', emoji: '🏎️', color: 'bg-red-500/10 border-red-500/20 text-red-400', espnSport: 'racing', espnLeague: 'f1' },
  { id: '5', name: 'Cricket', emoji: '🏏', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400', espnSport: 'cricket', espnLeague: 'ipl' },
  { id: '6', name: 'Rugby', emoji: '🏉', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400', espnSport: 'rugby', espnLeague: 'uru' },
  { id: '7', name: 'MMA', emoji: '🥊', color: 'bg-pink-500/10 border-pink-500/20 text-pink-400', espnSport: 'mma', espnLeague: 'ufc' },
  { id: '8', name: 'Baseball', emoji: '⚾', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400', espnSport: 'baseball', espnLeague: 'mlb' },
];

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };
  return (
    <div className={cn('rounded-full flex items-center justify-center font-black text-white shrink-0', sizes[size], color)}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ── Tipster Profile View ───────────────────────────────────────────────────
function TipsterProfileView({ tipster, currentUserId, onBack }: {
  tipster: Tipster;
  currentUserId: string | null;
  onBack: () => void;
}) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(tipster.followersCount || 0);
  const [channels, setChannels] = useState<{ id: string; name: string; [key: string]: any }[]>([]);
  const [recentTips, setRecentTips] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUserId) return;
    getDoc(doc(db, 'users', tipster.id, 'followers', currentUserId))
      .then(d => setIsFollowing(d.exists()));

    // Load tipster's channels
    const q = firestoreQuery(
      collection(db, 'channels'),
      orderBy('createdAt', 'desc')
    );
    getDocs(q).then(snap => {
      const tipsterChannels = snap.docs
        .filter(d => d.data().ownerId === tipster.id)
        .map(d => ({ id: d.id, ...d.data() } as { id: string; name: string; [key: string]: any }));
      setChannels(tipsterChannels);

      // Load recent tips from channels
      Promise.all(
        tipsterChannels.slice(0, 2).map(ch =>
          getDocs(firestoreQuery(
            collection(db, 'channels', ch.id, 'tips'),
            orderBy('createdAt', 'desc'),
            limit(3)
          )).then(s => s.docs.map(d => ({ id: d.id, channelName: ch.name, ...d.data() })))
        )
      ).then(results => setRecentTips(results.flat().slice(0, 5)));
    });
  }, [tipster.id, currentUserId]);

  const handleFollow = async () => {
    if (!currentUserId) return;
    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);
    setFollowerCount(n => n + (newFollowing ? 1 : -1));

    const followerRef = doc(db, 'users', tipster.id, 'followers', currentUserId);
    const followingRef = doc(db, 'users', currentUserId, 'following', tipster.id);

    if (newFollowing) {
      await setDoc(followerRef, { userId: currentUserId, createdAt: serverTimestamp() });
      await setDoc(followingRef, { userId: tipster.id, createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'users', tipster.id), { followersCount: increment(1) });
      await updateDoc(doc(db, 'users', currentUserId), { followingCount: increment(1) });
      const viewerDoc = await getDoc(doc(db, 'users', currentUserId));
      await addDoc(collection(db, 'notifications'), {
        userId: tipster.id,
        type: 'follow',
        title: 'New Follower! 👥',
        message: `${viewerDoc.data()?.displayName} started following you`,
        fromUserId: currentUserId,
        read: false,
        createdAt: serverTimestamp(),
      });
    } else {
      await deleteDoc(followerRef);
      await deleteDoc(followingRef);
      await updateDoc(doc(db, 'users', tipster.id), { followersCount: increment(-1) });
      await updateDoc(doc(db, 'users', currentUserId), { followingCount: increment(-1) });
    }
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] sticky top-14 z-20 bg-black/90 backdrop-blur">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <p className="font-black text-white">{tipster.displayName}</p>
      </div>

      {/* Cover */}
      <div className="h-24 bg-gradient-to-br from-[#ef4444]/30 via-[#1f1f1f] to-black" />

      {/* Profile info */}
      <div className="px-4 -mt-8 mb-4">
        <div className="flex items-end justify-between mb-3">
          <Avatar name={tipster.displayName} size="lg" />
          {currentUserId && currentUserId !== tipster.id && (
            <button onClick={handleFollow}
              className={cn('flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-bold transition-all',
                isFollowing
                  ? 'border border-[#1f1f1f] text-white hover:border-[#ef4444]/50'
                  : 'bg-white text-black hover:bg-white/90'
              )}>
              {isFollowing
                ? <><UserCheck className="w-3.5 h-3.5" /> Following</>
                : <><UserPlus className="w-3.5 h-3.5" /> Follow</>
              }
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-1">
          <p className="font-black text-white text-lg">{tipster.displayName}</p>
          {tipster.verified && (
            <CheckCircle className="w-4 h-4 text-[#ef4444] fill-[#ef4444]" />
          )}
          <span className="text-[10px] bg-[#ef4444]/20 text-[#ef4444] px-2 py-0.5 rounded-full font-black">TIPSTER</span>
        </div>

        {tipster.bio && <p className="text-sm text-[#71767b] mb-3">{tipster.bio}</p>}

        {tipster.sports && tipster.sports.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tipster.sports.map(s => (
              <span key={s} className="text-xs bg-white/5 text-[#71767b] px-2.5 py-1 rounded-full border border-white/10">{s}</span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-3 text-center">
            <p className="text-lg font-black text-green-400">{tipster.winRate || 0}%</p>
            <p className="text-[10px] text-[#71767b]">Win Rate</p>
          </div>
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-3 text-center">
            <p className="text-lg font-black text-white">{followerCount.toLocaleString()}</p>
            <p className="text-[10px] text-[#71767b]">Followers</p>
          </div>
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-3 text-center">
            <p className="text-lg font-black text-[#ef4444]">{tipster.tipsCount || 0}</p>
            <p className="text-[10px] text-[#71767b]">Tips</p>
          </div>
        </div>

        {/* Channels */}
        {channels.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-black text-white mb-2">Channels</p>
            {channels.map(ch => (
              <div key={ch.id} className="flex items-center justify-between bg-[#111] border border-[#1f1f1f] rounded-2xl p-3 mb-2">
                <div>
                  <p className="text-sm font-bold text-white">{ch.name}</p>
                  <p className="text-xs text-[#71767b]">{(ch.subscribers || 0).toLocaleString()} subscribers</p>
                </div>
                <div className="text-right">
                  {ch.type === 'paid' ? (
                    <span className="text-xs font-black text-yellow-400">₦{ch.price?.toLocaleString()}</span>
                  ) : (
                    <span className="text-xs font-black text-green-400">Free</span>
                  )}
                  <p className="text-[10px] text-[#71767b]">{ch.winRate || '0%'} win rate</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent tips */}
        {recentTips.length > 0 && (
          <div>
            <p className="text-sm font-black text-white mb-2">Recent Tips</p>
            {recentTips.map((tip: any) => (
              <div key={tip.id} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-3 mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#71767b]">{tip.channelName}</span>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-black',
                    tip.status === 'won' ? 'bg-green-500/20 text-green-400' :
                    tip.status === 'lost' ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                    'bg-yellow-500/20 text-yellow-400'
                  )}>
                    {tip.status === 'won' ? '✔ WON' : tip.status === 'lost' ? '✘ LOST' : '⏳ PENDING'}
                  </span>
                </div>
                {tip.matches?.slice(0, 2).map((m: any, i: number) => (
                  <p key={i} className="text-xs text-white">{m.home} vs {m.away}</p>
                ))}
                <p className="text-xs text-green-400 mt-1">@ {tip.totalOdds || tip.odds}x</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Explore Page ───────────────────────────────────────────────────────────
export function ExplorePage() {
  const [activeTab, setActiveTab] = useState<'trending' | 'sports' | 'news' | 'tipsters' | 'hashtags'>('trending');
  const [activeNewsFeed, setActiveNewsFeed] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [tipsters, setTipsters] = useState<Tipster[]>([]);
  const [trendingTips, setTrendingTips] = useState<Tip[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [following, setFollowing] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedTipster, setSelectedTipster] = useState<Tipster | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUserId(user?.uid || null);
    });
    return () => unsub();
  }, []);

  // Load following list
  useEffect(() => {
    if (!currentUserId) return;
    getDocs(collection(db, 'users', currentUserId, 'following')).then(snap => {
      setFollowing(snap.docs.map(d => d.id));
    });
  }, [currentUserId]);

  // Load tipsters
  useEffect(() => {
    const q = firestoreQuery(
      collection(db, 'users'),
      orderBy('followersCount', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(q, snapshot => {
      setTipsters(snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Tipster))
        .filter(u => u.role === 'tipster')
      );
    });
    return () => unsub();
  }, []);

  // Load trending tips
  useEffect(() => {
    const load = async () => {
      try {
        const channelsSnap = await getDocs(collection(db, 'channels'));
        const allTips: Tip[] = [];
        for (const ch of channelsSnap.docs) {
          const tipsSnap = await getDocs(
            firestoreQuery(collection(db, 'channels', ch.id, 'tips'), orderBy('likesCount', 'desc'), limit(3))
          );
          tipsSnap.docs.forEach(d => allTips.push({ id: d.id, ...d.data() } as Tip));
        }
        allTips.sort((a, b) => b.likesCount - a.likesCount);
        setTrendingTips(allTips.slice(0, 10));
      } catch { }
    };
    load();
  }, []);

  // Load ESPN news
  useEffect(() => {
    if (activeTab !== 'news') return;
    setNewsLoading(true);
    setNews([]);
    fetch(NEWS_FEEDS[activeNewsFeed].url)
      .then(r => r.json())
      .then(data => {
        const articles = data.articles || [];
        setNews(articles.filter((a: NewsArticle) => a.headline));
      })
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, [activeTab, activeNewsFeed]);

  const handleFollow = async (tipsterId: string) => {
    if (!currentUserId) return;
    const isFollowing = following.includes(tipsterId);
    if (isFollowing) {
      await deleteDoc(doc(db, 'users', currentUserId, 'following', tipsterId));
      await deleteDoc(doc(db, 'users', tipsterId, 'followers', currentUserId));
      await updateDoc(doc(db, 'users', tipsterId), { followersCount: increment(-1) });
      await updateDoc(doc(db, 'users', currentUserId), { followingCount: increment(-1) });
      setFollowing(prev => prev.filter(id => id !== tipsterId));
    } else {
      await setDoc(doc(db, 'users', currentUserId, 'following', tipsterId), {
        userId: tipsterId, followedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'users', tipsterId, 'followers', currentUserId), {
        userId: currentUserId, followedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', tipsterId), { followersCount: increment(1) });
      await updateDoc(doc(db, 'users', currentUserId), { followingCount: increment(1) });
      // Notification
      const viewerDoc = await getDoc(doc(db, 'users', currentUserId));
      await addDoc(collection(db, 'notifications'), {
        userId: tipsterId,
        type: 'follow',
        title: 'New Follower! 👥',
        message: `${viewerDoc.data()?.displayName} started following you`,
        fromUserId: currentUserId,
        read: false,
        createdAt: serverTimestamp(),
      });
      setFollowing(prev => [...prev, tipsterId]);
    }
  };

  const filteredTipsters = tipsters.filter(t =>
    t.displayName?.toLowerCase().includes(searchText.toLowerCase()) ||
    t.channelName?.toLowerCase().includes(searchText.toLowerCase())
  );

  if (selectedTipster) {
    return (
      <TipsterProfileView
        tipster={selectedTipster}
        currentUserId={currentUserId}
        onBack={() => setSelectedTipster(null)}
      />
    );
  }

  const tabs = [
    { key: 'trending', label: 'Trending', icon: TrendingUp },
    { key: 'sports', label: 'Sports', icon: Trophy },
    { key: 'news', label: 'News', icon: Newspaper },
    { key: 'tipsters', label: 'Tipsters', icon: Users },
    { key: 'hashtags', label: 'Hashtags', icon: Hash },
  ] as const;

  return (
    <div>
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 bg-[#111] rounded-full px-4 py-2.5 border border-[#1f1f1f] focus-within:border-[#ef4444]/30 transition-all">
            <Search className="w-4 h-4 text-[#71767b] shrink-0" />
            <input value={searchText} onChange={e => setSearchText(e.target.value)}
              placeholder="Search tipsters, sports, news..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
            />
            {searchText && <button onClick={() => setSearchText('')}><X className="w-4 h-4 text-[#71767b]" /></button>}
          </div>
        </div>
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide px-2 pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                  activeTab === tab.key ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
                )}>
                <Icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

          {/* Trending Tips */}
          {activeTab === 'trending' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <h2 className="text-base font-black text-white">Trending Tips</h2>
                <p className="text-xs text-[#71767b] mt-0.5">Most liked predictions right now</p>
              </div>
              {trendingTips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-3xl mb-3">🔥</p>
                  <p className="font-bold text-sm text-white">No trending tips yet</p>
                  <p className="text-xs text-[#71767b] mt-1">Tips appear here as tipsters post</p>
                </div>
              ) : trendingTips.map((tip, i) => (
                <motion.div key={tip.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-sm font-black text-[#71767b]">#{i + 1}</span>}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{tip.prediction}</p>
                      <p className="text-xs text-[#71767b]">{tip.tipsterName} · {tip.sport} · {tip.odds}x</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[#ef4444]">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{tip.likesCount}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Sports */}
          {activeTab === 'sports' && (
            <div className="p-4">
              <p className="text-base font-black text-white mb-1">Browse by Sport</p>
              <p className="text-xs text-[#71767b] mb-4">Find tipsters and channels by sport</p>
              <div className="grid grid-cols-2 gap-3">
                {sports.map((sport, i) => (
                  <motion.button key={sport.id}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                    onClick={() => setActiveTab('tipsters')}
                    className={cn('flex flex-col items-start p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95', sport.color)}>
                    <span className="text-2xl mb-2">{sport.emoji}</span>
                    <p className="font-bold text-white text-sm">{sport.name}</p>
                    <p className="text-[10px] text-white/50 mt-0.5">
                      {tipsters.filter(t => t.sports?.includes(sport.name)).length} tipsters
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* News */}
          {activeTab === 'news' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <h2 className="text-base font-black text-white mb-2">Sports News</h2>
                {/* Sport filter */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {NEWS_FEEDS.map((feed, i) => (
                    <button key={i} onClick={() => setActiveNewsFeed(i)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                        activeNewsFeed === i ? 'bg-[#ef4444] text-white' : 'bg-[#111] border border-[#1f1f1f] text-[#71767b]'
                      )}>{feed.label}</button>
                  ))}
                </div>
              </div>

              {newsLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs text-[#71767b]">Loading news...</p>
                </div>
              ) : news.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-3xl mb-3">📰</p>
                  <p className="font-bold text-sm text-white">No news available</p>
                  <p className="text-xs text-[#71767b] mt-1">Try a different sport category</p>
                </div>
              ) : news.map((article, i) => (
                <motion.a key={article.id || i}
                  href={article.links?.web?.href || '#'}
                  target="_blank" rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors">
                  {article.images?.[0]?.url && (
                    <img src={article.images[0].url} alt=""
                      className="w-20 h-16 rounded-xl object-cover shrink-0 bg-[#1f1f1f]"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] text-[#ef4444] font-bold">ESPN</span>
                      <span className="text-[10px] text-[#71767b]">·</span>
                      <span className="text-[10px] text-[#71767b]">
                        {new Date(article.published).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-white line-clamp-2 leading-snug">{article.headline}</p>
                    {article.description && (
                      <p className="text-xs text-[#71767b] mt-1 line-clamp-2">{article.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <ExternalLink className="w-3 h-3 text-[#ef4444]" />
                      <span className="text-[10px] text-[#ef4444]">Read more</span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          )}

          {/* Tipsters */}
          {activeTab === 'tipsters' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <h2 className="text-base font-black text-white">Top Tipsters</h2>
                <p className="text-xs text-[#71767b] mt-0.5">Tap a tipster to view their profile</p>
              </div>
              {filteredTipsters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-3xl mb-3">🏆</p>
                  <p className="font-bold text-sm text-white">No tipsters yet</p>
                </div>
              ) : filteredTipsters.map((tipster, i) => (
                <motion.div key={tipster.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors">
                  {/* Tap avatar/name to view profile */}
                  <button className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => setSelectedTipster(tipster)}>
                    <Avatar name={tipster.displayName} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-white">{tipster.displayName}</p>
                        {tipster.verified && <CheckCircle className="w-3.5 h-3.5 text-[#ef4444] fill-[#ef4444]" />}
                        <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1 rounded font-bold">TIPSTER</span>
                      </div>
                      {tipster.channelName && <p className="text-xs text-[#ef4444]">{tipster.channelName}</p>}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-green-400 font-bold">
                          <Zap className="w-2.5 h-2.5 inline" /> {tipster.winRate || 0}% win
                        </span>
                        <span className="text-[10px] text-[#71767b]">{tipster.followersCount || 0} followers</span>
                      </div>
                    </div>
                  </button>

                  {currentUserId && currentUserId !== tipster.id && (
                    <button onClick={() => handleFollow(tipster.id)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0',
                        following.includes(tipster.id)
                          ? 'border border-white/20 text-[#71767b]'
                          : 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white'
                      )}>
                      {following.includes(tipster.id) ? 'Following' : 'Follow'}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Hashtags */}
          {activeTab === 'hashtags' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <h2 className="text-base font-black text-white">Trending Hashtags</h2>
              </div>
              {[
                { tag: '#ChampionsLeague', posts: '2.4M', category: 'Football', hot: true },
                { tag: '#NBAPlayoffs', posts: '1.8M', category: 'Basketball', hot: true },
                { tag: '#WorldCup2026', posts: '5.2M', category: 'Football', hot: true },
                { tag: '#PremierLeague', posts: '654K', category: 'Football', hot: false },
                { tag: '#F1Monaco', posts: '432K', category: 'F1', hot: true },
                { tag: '#LaLiga', posts: '321K', category: 'Football', hot: false },
                { tag: '#NBA', posts: '234K', category: 'Basketball', hot: false },
                { tag: '#UFC', posts: '198K', category: 'MMA', hot: false },
                { tag: '#AFCON', posts: '145K', category: 'Football', hot: false },
                { tag: '#NPFL', posts: '89K', category: 'Football', hot: false },
              ].map((item, i) => (
                <motion.div key={item.tag}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-[#ef4444]/10 flex items-center justify-center shrink-0">
                    <Hash className="w-5 h-5 text-[#ef4444]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-white">{item.tag}</p>
                    <p className="text-xs text-[#71767b]">{item.posts} posts · {item.category}</p>
                  </div>
                  {item.hot && <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded-full font-bold">🔥 HOT</span>}
                </motion.div>
              ))}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
