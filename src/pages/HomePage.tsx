import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Heart, MessageCircle, Repeat2,
  Bookmark, Share, MoreHorizontal, Zap,
  Image, Smile, X, Plus, Video, BarChart2,
  MapPin, Play
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query as firestoreQuery, orderBy, limit,
  doc, setDoc, deleteDoc, getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── API Football Config ────────────────────────────────────────────────────
const API_KEY = '71b6bd51ec2a77eee7d4a472b85436f0';
const API_BASE = 'https://v3.football.api-sports.io';

// Key matches leagues — what shows in the live ticker
// These are important competitions only
const KEY_LEAGUES = [
  { id: 1, name: 'World Cup', season: 2026 },
  { id: 2, name: 'Champions League', season: 2025 },
  { id: 3, name: 'Europa League', season: 2025 },
  { id: 39, name: 'Premier League', season: 2025 },
  { id: 140, name: 'La Liga', season: 2025 },
  { id: 78, name: 'Bundesliga', season: 2025 },
  { id: 135, name: 'Serie A', season: 2025 },
  { id: 61, name: 'Ligue 1', season: 2025 },
  { id: 253, name: 'MLS', season: 2025 },
  { id: 71, name: 'Brazil Série A', season: 2025 },
  { id: 4, name: 'Euro Championship', season: 2024 },
  { id: 6, name: 'Africa Cup (AFCON)', season: 2025 },
  { id: 667, name: 'World Cup Qualifying', season: 2026 },
];

// ── Types ──────────────────────────────────────────────────────────────────
interface Post {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  verified: boolean;
  tipster: boolean;
  content: string;
  image?: string;
  video?: string;
  tag?: string;
  likes: number;
  comments: number;
  reposts: number;
  createdAt: any;
}

interface LiveMatch {
  id: number;
  home: string;
  homeLogo: string;
  away: string;
  awayLogo: string;
  homeScore: number;
  awayScore: number;
  minute: string;
  league: string;
  status: string;
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  return (
    <div className={cn('rounded-full flex items-center justify-center font-black text-white shrink-0', sizes[size], color)}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ── Live Ticker ────────────────────────────────────────────────────────────
function LiveTicker() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveMatches = async () => {
    try {
      // Fetch all live matches across all leagues
      const res = await fetch(`${API_BASE}/fixtures?live=all`, {
        headers: { 'x-apisports-key': API_KEY },
      });
      const data = await res.json();
      const fixtures = data.response || [];

      // Filter to only key leagues and map to LiveMatch
      const keyLeagueIds = KEY_LEAGUES.map(l => l.id);
      const filtered = fixtures
        .filter((f: any) => keyLeagueIds.includes(f.league.id))
        .slice(0, 10)
        .map((f: any) => ({
          id: f.fixture.id,
          home: f.teams.home.name,
          homeLogo: f.teams.home.logo,
          away: f.teams.away.name,
          awayLogo: f.teams.away.logo,
          homeScore: f.goals.home ?? 0,
          awayScore: f.goals.away ?? 0,
          minute: f.fixture.status.elapsed ? `${f.fixture.status.elapsed}'` : f.fixture.status.short,
          league: f.league.name,
          status: f.fixture.status.short,
        }));

      // If no live matches in key leagues, get today's key matches instead
      if (filtered.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        const todayRes = await fetch(`${API_BASE}/fixtures?date=${today}`, {
          headers: { 'x-apisports-key': API_KEY },
        });
        const todayData = await todayRes.json();
        const todayFixtures = (todayData.response || [])
          .filter((f: any) => keyLeagueIds.includes(f.league.id))
          .slice(0, 8)
          .map((f: any) => ({
            id: f.fixture.id,
            home: f.teams.home.name,
            homeLogo: f.teams.home.logo,
            away: f.teams.away.name,
            awayLogo: f.teams.away.logo,
            homeScore: f.goals.home ?? 0,
            awayScore: f.goals.away ?? 0,
            minute: ['FT', 'AET', 'PEN'].includes(f.fixture.status.short)
              ? 'FT'
              : f.fixture.status.short === 'NS'
                ? new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : f.fixture.status.elapsed ? `${f.fixture.status.elapsed}'` : f.fixture.status.short,
            league: f.league.name,
            status: f.fixture.status.short,
          }));
        setLiveMatches(todayFixtures);
      } else {
        setLiveMatches(filtered);
      }
    } catch (e) {
      // Silently fail — ticker just won't show
      setLiveMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMatches();
    // Refresh every 60 seconds
    const interval = setInterval(fetchLiveMatches, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || liveMatches.length === 0) return null;

  const hasLive = liveMatches.some(m => !['FT', 'AET', 'PEN', 'NS', 'TBD', 'PST'].includes(m.status));

  return (
    <div className="px-4 py-2.5 border-b border-[#1f1f1f] bg-[#ef4444]/[0.03]">
      <div className="flex items-center gap-2 mb-2">
        {hasLive ? (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
            <span className="text-xs font-black text-[#ef4444]">LIVE NOW</span>
          </>
        ) : (
          <>
            <Zap className="w-3.5 h-3.5 text-[#ef4444]" />
            <span className="text-xs font-black text-[#ef4444]">KEY MATCHES TODAY</span>
          </>
        )}
        <span className="text-xs text-[#71767b]">{liveMatches.length} matches</span>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {liveMatches.map(match => {
          const isLive = !['FT', 'AET', 'PEN', 'NS', 'TBD', 'PST'].includes(match.status);
          const isFinished = ['FT', 'AET', 'PEN'].includes(match.status);
          const hasScore = isLive || isFinished;

          return (
            <motion.div key={match.id} whileTap={{ scale: 0.97 }}
              className="shrink-0 bg-[#111] border border-[#1f1f1f] hover:border-[#ef4444]/30 rounded-2xl px-3 py-2.5 min-w-[200px] transition-all cursor-pointer">
              {/* League */}
              <p className="text-[9px] text-[#71767b] font-semibold mb-1.5 truncate">{match.league}</p>

              {/* Teams + Score */}
              <div className="flex items-center gap-2">
                {/* Home */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {match.homeLogo ? (
                    <img src={match.homeLogo} alt="" className="w-5 h-5 object-contain shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
                  )}
                  <p className="text-xs font-bold text-white truncate">{match.home}</p>
                </div>

                {/* Score / Time */}
                <div className="shrink-0 text-center px-2">
                  {hasScore ? (
                    <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-lg',
                      isLive ? 'bg-[#ef4444]/20' : 'bg-white/5'
                    )}>
                      <span className={cn('text-sm font-black', isLive ? 'text-[#ef4444]' : 'text-white')}>
                        {match.homeScore}
                      </span>
                      <span className="text-[#71767b] text-xs">-</span>
                      <span className={cn('text-sm font-black', isLive ? 'text-[#ef4444]' : 'text-white')}>
                        {match.awayScore}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-black text-[#ef4444]">VS</span>
                  )}
                  <p className={cn('text-[9px] font-bold mt-0.5', isLive ? 'text-[#ef4444]' : 'text-[#71767b]')}>
                    {match.minute}
                  </p>
                </div>

                {/* Away */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                  <p className="text-xs font-bold text-white truncate">{match.away}</p>
                  {match.awayLogo ? (
                    <img src={match.awayLogo} alt="" className="w-5 h-5 object-contain shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Post Modal ─────────────────────────────────────────────────────────────
function PostModal({ onClose, currentUser }: {
  onClose: () => void;
  currentUser: { uid: string; name: string; handle: string; tipster: boolean; verified: boolean } | null;
}) {
  const [text, setText] = useState('');
  const [activeType, setActiveType] = useState<'post' | 'prediction'>('post');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState({ match: '', tip: '', odds: '' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoPreview(null); setVideoName('');
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(null);
    setVideoName(file.name);
    setVideoPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => { setImagePreview(null); setVideoPreview(null); setVideoName(''); };

  const handlePost = async () => {
    if (!text.trim() || !currentUser) return;
    setLoading(true);
    try {
      const postContent = activeType === 'prediction' && prediction.match
        ? `${text}\n\n⚽ ${prediction.match}\n🎯 ${prediction.tip}${prediction.odds ? ` @ ${prediction.odds}` : ''}`
        : text;

      await addDoc(collection(db, 'posts'), {
        userId: currentUser.uid,
        userName: currentUser.name,
        userHandle: currentUser.handle,
        verified: currentUser.verified,
        tipster: currentUser.tipster,
        content: postContent,
        tag: activeType === 'prediction' ? 'Prediction' : 'Sports',
        likes: 0,
        comments: 0,
        reposts: 0,
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch (e) {
      console.error('Error posting:', e);
    } finally {
      setLoading(false);
    }
  };

  const tools = [
    { icon: Image, label: 'Photo', action: () => imageInputRef.current?.click() },
    { icon: Video, label: 'Video', action: () => videoInputRef.current?.click() },
    { icon: BarChart2, label: 'Poll', action: () => {} },
    { icon: Smile, label: 'Emoji', action: () => {} },
    { icon: MapPin, label: 'Location', action: () => {} },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center md:justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full md:max-w-lg bg-[#0d0d0d] border border-[#1f1f1f] rounded-t-3xl md:rounded-3xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-1 bg-[#111] rounded-full p-1">
            {(['post', 'prediction'] as const).map(t => (
              <button key={t} onClick={() => setActiveType(t)}
                className={cn('px-3 py-1 rounded-full text-xs font-bold transition-all capitalize',
                  activeType === t ? 'bg-[#ef4444] text-white' : 'text-[#71767b]'
                )}>{t}</button>
            ))}
          </div>
          <button onClick={handlePost} disabled={!text.trim() || loading}
            className="px-4 py-1.5 bg-[#ef4444] rounded-full text-sm font-bold text-white disabled:opacity-40 hover:bg-[#dc2626] transition-colors">
            {loading ? '...' : 'Post'}
          </button>
        </div>

        <div className="flex gap-3 px-4 py-4">
          <Avatar name={currentUser?.name || 'U'} size="md" />
          <div className="flex-1">
            <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)}
              placeholder={activeType === 'post' ? "What's happening in sports?" : "Share your prediction or hot take..."}
              rows={4}
              className="w-full bg-transparent text-white placeholder:text-[#71767b] text-base outline-none resize-none leading-relaxed"
            />

            <AnimatePresence>
              {imagePreview && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="relative mt-2 rounded-2xl overflow-hidden border border-[#1f1f1f]">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover rounded-2xl" />
                  <button onClick={clearMedia} className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {videoPreview && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="relative mt-2 rounded-2xl overflow-hidden border border-[#1f1f1f] bg-[#111]">
                  <video src={videoPreview} controls className="w-full max-h-64 rounded-2xl" />
                  <button onClick={clearMedia} className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <div className="px-3 py-1.5 flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-[#71767b]" />
                    <p className="text-xs text-[#71767b] truncate">{videoName}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeType === 'prediction' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2">
                  <input placeholder="Match (e.g. Man City vs Arsenal)"
                    value={prediction.match} onChange={e => setPrediction(p => ({ ...p, match: e.target.value }))}
                    className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Your prediction"
                      value={prediction.tip} onChange={e => setPrediction(p => ({ ...p, tip: e.target.value }))}
                      className="bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                    />
                    <input placeholder="Odds (optional)"
                      value={prediction.odds} onChange={e => setPrediction(p => ({ ...p, odds: e.target.value }))}
                      className="bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />

        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1f1f1f]">
          <div className="flex items-center gap-1 text-[#ef4444]">
            {tools.map(tool => {
              const Icon = tool.icon;
              return (
                <button key={tool.label} onClick={tool.action} className="p-2 rounded-full hover:bg-[#ef4444]/10 transition-colors" title={tool.label}>
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
          {text && (
            <span className={cn('text-xs font-semibold', text.length > 260 ? 'text-[#ef4444]' : 'text-[#71767b]')}>
              {280 - text.length}
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Post Card ──────────────────────────────────────────────────────────────
function PostCard({ post, currentUserId }: { post: Post; currentUserId: string | null }) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  const handleLike = async () => {
    if (!currentUserId) return;
    if (liked) {
      await deleteDoc(doc(db, 'posts', post.id, 'likes', currentUserId));
    } else {
      await setDoc(doc(db, 'posts', post.id, 'likes', currentUserId), {
        userId: currentUserId, createdAt: serverTimestamp(),
      });
    }
    setLiked(l => !l);
  };

  const handleBookmark = async () => {
    if (!currentUserId) return;
    if (bookmarked) {
      await deleteDoc(doc(db, 'users', currentUserId, 'bookmarks', post.id));
    } else {
      await setDoc(doc(db, 'users', currentUserId, 'bookmarks', post.id), {
        postId: post.id, createdAt: serverTimestamp(),
      });
    }
    setBookmarked(b => !b);
  };

  const timeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate?.() || new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors cursor-pointer">
      <div className="flex gap-3">
        <Avatar name={post.userName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="font-bold text-sm text-white truncate">{post.userName}</span>
              {post.verified && (
                <div className="w-4 h-4 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0">
                  <Zap className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              {post.tipster && (
                <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded-full font-bold shrink-0">TIPSTER</span>
              )}
              <span className="text-[#71767b] text-xs">{post.userHandle} · {timeAgo(post.createdAt)}</span>
            </div>
            <button className="p-1 rounded-full hover:bg-white/5 text-[#71767b] shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {post.tag && (
            <span className="inline-block text-[10px] text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded-full mb-1.5 font-semibold">
              {post.tag}
            </span>
          )}

          <p className="text-sm text-[#e7e9ea] leading-relaxed mb-2 whitespace-pre-line">{post.content}</p>

          {post.image && (
            <div className="mb-3 rounded-2xl overflow-hidden border border-[#1f1f1f]">
              <img src={post.image} alt="Post" className="w-full max-h-80 object-cover" />
            </div>
          )}

          {post.video && (
            <div className="mb-3 rounded-2xl overflow-hidden border border-[#1f1f1f] bg-[#111]">
              <video src={post.video} controls className="w-full max-h-80 rounded-2xl" />
            </div>
          )}

          <div className="flex items-center justify-between text-[#71767b]">
            <button className="flex items-center gap-1.5 hover:text-[#ef4444] transition-colors group">
              <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-xs">{fmt(post.comments)}</span>
            </button>
            <button onClick={() => setReposted(r => !r)}
              className={cn('flex items-center gap-1.5 transition-colors group', reposted ? 'text-green-500' : 'hover:text-green-500')}>
              <div className="p-1.5 rounded-full group-hover:bg-green-500/10 transition-colors">
                <Repeat2 className="w-4 h-4" />
              </div>
              <span className="text-xs">{fmt(post.reposts + (reposted ? 1 : 0))}</span>
            </button>
            <button onClick={handleLike}
              className={cn('flex items-center gap-1.5 transition-colors group', liked ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}>
              <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10 transition-colors">
                <Heart className={cn('w-4 h-4', liked && 'fill-[#ef4444]')} />
              </div>
              <span className="text-xs">{fmt(post.likes + (liked ? 1 : 0))}</span>
            </button>
            <button onClick={handleBookmark}
              className={cn('flex items-center gap-1.5 transition-colors group', bookmarked ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}>
              <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10 transition-colors">
                <Bookmark className={cn('w-4 h-4', bookmarked && 'fill-[#ef4444]')} />
              </div>
            </button>
            <button className="flex items-center gap-1.5 hover:text-[#ef4444] transition-colors group">
              <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10 transition-colors">
                <Share className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Home Page ──────────────────────────────────────────────────────────────
export function HomePage() {
  const [activeTab, setActiveTab] = useState<'trending' | 'new' | 'following'>('trending');
  const [showModal, setShowModal] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchText, setSearchText] = useState('');
  const [currentUser, setCurrentUser] = useState<{
    uid: string; name: string; handle: string; tipster: boolean; verified: boolean;
  } | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setCurrentUser({
            uid: user.uid,
            name: data.displayName || 'User',
            handle: `@${data.displayName?.toLowerCase().replace(/\s/g, '') || 'user'}`,
            tipster: data.role === 'tipster',
            verified: data.verified || false,
          });
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const postsRef = collection(db, 'posts');
    const postsQuery = activeTab === 'new'
      ? firestoreQuery(postsRef, orderBy('createdAt', 'desc'), limit(30))
      : firestoreQuery(postsRef, orderBy('likes', 'desc'), limit(30));
    const unsub = onSnapshot(postsQuery, snapshot => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    });
    return () => unsub();
  }, [activeTab]);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setShowButton(currentY <= lastScrollY.current || currentY <= 100);
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredPosts = posts.filter(p =>
    p.content.toLowerCase().includes(searchText.toLowerCase()) ||
    p.userName.toLowerCase().includes(searchText.toLowerCase())
  );

  const tabs = [
    { key: 'trending', label: '🔥 Trending' },
    { key: 'new', label: '✨ New' },
    { key: 'following', label: '👥 Following' },
  ] as const;

  return (
    <div>
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="flex items-center gap-1 px-4 pt-3 pb-2">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                activeTab === tab.key ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
              )}>{tab.label}</button>
          ))}
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-[#111] rounded-full px-4 py-2 border border-[#1f1f1f] focus-within:border-[#ef4444]/30 transition-all">
            <Search className="w-4 h-4 text-[#71767b] shrink-0" />
            <input value={searchText} onChange={e => setSearchText(e.target.value)}
              placeholder="Search Arena..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
            />
            {searchText && (
              <button onClick={() => setSearchText('')}><X className="w-3.5 h-3.5 text-[#71767b]" /></button>
            )}
          </div>
        </div>
      </div>

      {/* Real live ticker */}
      <LiveTicker />

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-3xl mb-3">🏟️</p>
              <p className="font-bold text-sm text-white">No posts yet</p>
              <p className="text-xs text-[#71767b] mt-1">Be the first to post something!</p>
            </div>
          ) : filteredPosts.map(post => (
            <PostCard key={post.id} post={post} currentUserId={currentUser?.uid || null} />
          ))}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showButton && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }} onClick={() => setShowModal(true)}
            className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-br from-[#dc2626] to-[#ef4444] rounded-full flex items-center justify-center shadow-xl shadow-red-500/40 z-20">
            <Plus className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && <PostModal onClose={() => setShowModal(false)} currentUser={currentUser} />}
      </AnimatePresence>
    </div>
  );
}
