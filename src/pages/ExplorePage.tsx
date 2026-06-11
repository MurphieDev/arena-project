import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, Users, Hash, Trophy, X, Zap,
  Newspaper, ExternalLink, Heart
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TeamDetailPage } from './TeamDetailPage';
import { PlayerProfilePage } from './PlayerProfilePage';
import { db, auth } from '../lib/firebase';
import {
  collection, onSnapshot, doc, setDoc,
  deleteDoc, query as firestoreQuery,
  orderBy, limit, getDocs
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const NEWS_API_KEY = 'eff6d0b300534380a753fd0d2ab07fe8';

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
}

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: { name: string };
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
  { id: '1', name: 'Football', emoji: '⚽', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
  { id: '2', name: 'Basketball', emoji: '🏀', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
  { id: '3', name: 'Tennis', emoji: '🎾', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
  { id: '4', name: 'F1', emoji: '🏎️', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
  { id: '5', name: 'Cricket', emoji: '🏏', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  { id: '6', name: 'Rugby', emoji: '🏉', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
  { id: '7', name: 'MMA', emoji: '🥊', color: 'bg-pink-500/10 border-pink-500/20 text-pink-400' },
  { id: '8', name: 'Baseball', emoji: '⚾', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
];

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0', color)}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ── Explore Page ───────────────────────────────────────────────────────────
export function ExplorePage() {
  const [activeTab, setActiveTab] = useState<'trending' | 'sports' | 'news' | 'tipsters' | 'hashtags'>('trending');
  const [searchText, setSearchText] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [tipsters, setTipsters] = useState<Tipster[]>([]);
  const [trendingTips, setTrendingTips] = useState<Tip[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [following, setFollowing] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUserId(user?.uid || null);
    });
    return () => unsub();
  }, []);

  // Load tipsters from Firestore
  useEffect(() => {
    const q = firestoreQuery(
      collection(db, 'users'),
      orderBy('followersCount', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, snapshot => {
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Tipster))
        .filter(u => u.role === 'tipster');
      setTipsters(data);
    });
    return () => unsub();
  }, []);

  // Load trending tips (most liked) from all channels
  useEffect(() => {
    const loadTrendingTips = async () => {
      try {
        const channelsSnap = await getDocs(collection(db, 'channels'));
        const allTips: Tip[] = [];
        for (const channelDoc of channelsSnap.docs) {
          const tipsQ = firestoreQuery(
            collection(db, 'channels', channelDoc.id, 'tips'),
            orderBy('likesCount', 'desc'),
            limit(3)
          );
          const tipsSnap = await getDocs(tipsQ);
          tipsSnap.docs.forEach(d => allTips.push({ id: d.id, ...d.data() } as Tip));
        }
        allTips.sort((a, b) => b.likesCount - a.likesCount);
        setTrendingTips(allTips.slice(0, 10));
      } catch (e) {
        console.error('Error loading trending tips:', e);
      }
    };
    loadTrendingTips();
  }, []);

  // Load sports news
  useEffect(() => {
    if (activeTab !== 'news') return;
    setNewsLoading(true);
    fetch(
      `https://newsapi.org/v2/top-headlines?category=sports&language=en&pageSize=20&apiKey=${NEWS_API_KEY}`
    )
      .then(r => r.json())
      .then(data => {
        if (data.articles) {
          setNews(data.articles.filter((a: NewsArticle) => a.title && a.description));
        }
      })
      .catch(e => console.error('News error:', e))
      .finally(() => setNewsLoading(false));
  }, [activeTab]);

  // Follow/unfollow tipster
  const handleFollow = async (tipsterId: string) => {
    if (!currentUserId) return;
    if (following.includes(tipsterId)) {
      await deleteDoc(doc(db, 'users', currentUserId, 'following', tipsterId));
      await deleteDoc(doc(db, 'users', tipsterId, 'followers', currentUserId));
      setFollowing(prev => prev.filter(id => id !== tipsterId));
    } else {
      await setDoc(doc(db, 'users', currentUserId, 'following', tipsterId), {
        userId: tipsterId,
        followedAt: new Date(),
      });
      await setDoc(doc(db, 'users', tipsterId, 'followers', currentUserId), {
        userId: currentUserId,
        followedAt: new Date(),
      });
      setFollowing(prev => [...prev, tipsterId]);
    }
  };

  // Filter by search
  const filteredTipsters = tipsters.filter(t =>
    t.displayName?.toLowerCase().includes(searchText.toLowerCase()) ||
    t.channelName?.toLowerCase().includes(searchText.toLowerCase())
  );

  if (selectedTeam) return <TeamDetailPage onBack={() => setSelectedTeam(null)} />;
  if (selectedPlayer) return <PlayerProfilePage onBack={() => setSelectedPlayer(null)} />;

  const tabs = [
    { key: 'trending', label: 'Trending', icon: TrendingUp },
    { key: 'sports',   label: 'Sports',   icon: Trophy },
    { key: 'news',     label: 'News',     icon: Newspaper },
    { key: 'tipsters', label: 'Tipsters', icon: Users },
    { key: 'hashtags', label: 'Hashtags', icon: Hash },
  ] as const;

  return (
    <div>
      {/* Sticky Header */}
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 bg-[#111] rounded-full px-4 py-2.5 border border-[#1f1f1f] focus-within:border-[#ef4444]/30 transition-all">
            <Search className="w-4 h-4 text-[#71767b] shrink-0" />
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search tipsters, sports, news..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
            />
            {searchText && (
              <button onClick={() => setSearchText('')}>
                <X className="w-4 h-4 text-[#71767b] hover:text-white transition-colors" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide px-2 pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                  isActive ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >

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
                  <p className="text-xs text-[#71767b] mt-1">Tips will appear here as tipsters post</p>
                </div>
              ) : trendingTips.map((tip, i) => (
                <motion.div
                  key={tip.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center">
                      {i === 0 ? <span className="text-lg">🥇</span>
                        : i === 1 ? <span className="text-lg">🥈</span>
                        : i === 2 ? <span className="text-lg">🥉</span>
                        : <span className="text-sm font-black text-[#71767b]">#{i + 1}</span>
                      }
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
              <h2 className="text-base font-black text-white mb-3">Browse by Sport</h2>
              <div className="grid grid-cols-2 gap-3">
                {sports.map((sport, i) => (
                  <motion.button
                    key={sport.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn('flex flex-col items-start p-4 rounded-2xl border transition-all hover:scale-[1.02]', sport.color)}
                  >
                    <span className="text-2xl mb-2">{sport.emoji}</span>
                    <p className="font-bold text-white text-sm">{sport.name}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* News */}
          {activeTab === 'news' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <h2 className="text-base font-black text-white">Sports News</h2>
                <p className="text-xs text-[#71767b] mt-0.5">Latest from around the world</p>
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
                  <p className="text-xs text-[#71767b] mt-1">Check back later</p>
                </div>
              ) : news.map((article, i) => (
                <motion.a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  {article.urlToImage && (
                    <img
                      src={article.urlToImage}
                      alt=""
                      className="w-20 h-16 rounded-xl object-cover shrink-0 bg-[#1f1f1f]"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] text-[#ef4444] font-bold">{article.source.name}</span>
                      <span className="text-[10px] text-[#71767b]">·</span>
                      <span className="text-[10px] text-[#71767b]">
                        {new Date(article.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-white line-clamp-2 leading-snug">{article.title}</p>
                    <p className="text-xs text-[#71767b] mt-1 line-clamp-2">{article.description}</p>
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
                <p className="text-xs text-[#71767b] mt-0.5">Discover and follow the best tipsters</p>
              </div>
              {filteredTipsters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-3xl mb-3">🏆</p>
                  <p className="font-bold text-sm text-white">No tipsters yet</p>
                  <p className="text-xs text-[#71767b] mt-1">Tipsters will appear here once they register</p>
                </div>
              ) : filteredTipsters.map((tipster, i) => (
                <motion.div
                  key={tipster.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={tipster.displayName} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-white">{tipster.displayName}</p>
                        <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1 rounded font-bold">TIPSTER</span>
                      </div>
                      {tipster.channelName && (
                        <p className="text-xs text-[#ef4444]">{tipster.channelName}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-green-400 font-bold flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" />{tipster.winRate || 0}% win rate
                        </span>
                        <span className="text-[10px] text-[#71767b]">
                          {tipster.followersCount || 0} followers
                        </span>
                      </div>
                      {tipster.sports && tipster.sports.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {tipster.sports.slice(0, 3).map(s => (
                            <span key={s} className="text-[9px] bg-white/5 text-[#71767b] px-1.5 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {currentUserId && currentUserId !== tipster.id && (
                    <button
                      onClick={() => handleFollow(tipster.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0',
                        following.includes(tipster.id)
                          ? 'border border-white/20 text-[#71767b]'
                          : 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white'
                      )}
                    >
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
                { tag: '#Wimbledon', posts: '890K', category: 'Tennis', hot: false },
                { tag: '#PremierLeague', posts: '654K', category: 'Football', hot: false },
                { tag: '#F1Monaco', posts: '432K', category: 'F1', hot: true },
                { tag: '#LaLiga', posts: '321K', category: 'Football', hot: false },
                { tag: '#NBA', posts: '234K', category: 'Basketball', hot: false },
                { tag: '#UFC', posts: '198K', category: 'MMA', hot: false },
              ].map((item, i) => (
                <motion.div
                  key={item.tag}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#ef4444]/10 flex items-center justify-center shrink-0">
                    <Hash className="w-5 h-5 text-[#ef4444]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-white">{item.tag}</p>
                    <p className="text-xs text-[#71767b]">{item.posts} posts · {item.category}</p>
                  </div>
                  {item.hot && (
                    <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded-full font-bold">🔥 HOT</span>
                  )}
                </motion.div>
              ))}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
