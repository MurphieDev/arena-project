import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Heart, MessageCircle, Repeat2,
  Bookmark, Share, MoreHorizontal, Zap,
  Image, Smile, X, Plus, Video, BarChart2,
  MapPin,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query as firestoreQuery, orderBy, limit,
  doc, setDoc, deleteDoc, getDoc, updateDoc, increment,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── API Football Config ────────────────────────────────────────────────────
const API_KEY = '71b6bd51ec2a77eee7d4a472b85436f0';
const API_BASE = 'https://v3.football.api-sports.io';

const KEY_LEAGUES = [
  { id: 1, season: 2026 }, { id: 2, season: 2025 },
  { id: 39, season: 2025 }, { id: 140, season: 2025 },
  { id: 78, season: 2025 }, { id: 253, season: 2026 },
  { id: 71, season: 2025 },
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

interface CurrentUser {
  uid: string;
  name: string;
  handle: string;
  tipster: boolean;
  verified: boolean;
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
  const [matches, setMatches] = useState<LiveMatch[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await window.fetch(`${API_BASE}/fixtures?live=all`, {
          headers: { 'x-apisports-key': API_KEY },
        });
        const data = await res.json();
        const keyLeagueIds = KEY_LEAGUES.map(l => l.id);
        let fixtures = (data.response || [])
          .filter((f: any) => keyLeagueIds.includes(f.league.id))
          .slice(0, 10);

        if (fixtures.length === 0) {
          const today = new Date().toISOString().split('T')[0];
          const r2 = await window.fetch(`${API_BASE}/fixtures?date=${today}`, {
            headers: { 'x-apisports-key': API_KEY },
          });
          const d2 = await r2.json();
          fixtures = (d2.response || [])
            .filter((f: any) => keyLeagueIds.includes(f.league.id))
            .slice(0, 8);
        }

        setMatches(fixtures.map((f: any) => ({
          id: f.fixture.id,
          home: f.teams.home.name,
          homeLogo: f.teams.home.logo,
          away: f.teams.away.name,
          awayLogo: f.teams.away.logo,
          homeScore: f.goals.home ?? 0,
          awayScore: f.goals.away ?? 0,
          minute: f.fixture.status.elapsed
            ? `${f.fixture.status.elapsed}'`
            : ['FT', 'AET', 'PEN'].includes(f.fixture.status.short)
              ? 'FT'
              : new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          league: f.league.name,
          status: f.fixture.status.short,
        })));
      } catch { /* silently fail */ }
    };
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!matches.length) return null;

  const hasLive = matches.some(m => !['FT', 'AET', 'PEN', 'NS', 'TBD', 'PST'].includes(m.status));

  return (
    <div className="px-4 py-2.5 border-b border-[#1f1f1f] bg-[#ef4444]/[0.03]">
      <div className="flex items-center gap-2 mb-2">
        {hasLive
          ? <><div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" /><span className="text-xs font-black text-[#ef4444]">LIVE NOW</span></>
          : <><Zap className="w-3.5 h-3.5 text-[#ef4444]" /><span className="text-xs font-black text-[#ef4444]">KEY MATCHES</span></>
        }
        <span className="text-xs text-[#71767b]">{matches.length} matches</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {matches.map(m => {
          const isLive = !['FT', 'AET', 'PEN', 'NS', 'TBD', 'PST'].includes(m.status);
          const hasScore = isLive || ['FT', 'AET', 'PEN'].includes(m.status);
          return (
            <div key={m.id} className="shrink-0 bg-[#111] border border-[#1f1f1f] rounded-2xl px-3 py-2.5 min-w-[200px]">
              <p className="text-[9px] text-[#71767b] font-semibold mb-1.5 truncate">{m.league}</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {m.homeLogo && <img src={m.homeLogo} alt="" className="w-5 h-5 object-contain shrink-0" />}
                  <p className="text-xs font-bold text-white truncate">{m.home}</p>
                </div>
                <div className="shrink-0 text-center px-1">
                  {hasScore
                    ? <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-lg', isLive ? 'bg-[#ef4444]/20' : 'bg-white/5')}>
                        <span className={cn('text-sm font-black', isLive ? 'text-[#ef4444]' : 'text-white')}>{m.homeScore}</span>
                        <span className="text-[#71767b] text-xs">-</span>
                        <span className={cn('text-sm font-black', isLive ? 'text-[#ef4444]' : 'text-white')}>{m.awayScore}</span>
                      </div>
                    : <span className="text-xs font-black text-[#ef4444]">VS</span>
                  }
                  <p className={cn('text-[9px] font-bold mt-0.5', isLive ? 'text-[#ef4444]' : 'text-[#71767b]')}>{m.minute}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                  <p className="text-xs font-bold text-white truncate">{m.away}</p>
                  {m.awayLogo && <img src={m.awayLogo} alt="" className="w-5 h-5 object-contain shrink-0" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Post Modal ─────────────────────────────────────────────────────────────
function PostModal({ onClose, currentUser }: {
  onClose: () => void;
  currentUser: CurrentUser | null;
}) {
  const [text, setText] = useState('');
  const [activeType, setActiveType] = useState<'post' | 'prediction'>('post');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState({ match: '', tip: '', odds: '' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

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
        bookmarks: 0,
        createdAt: serverTimestamp(),
      });

      // Send notification to followers
      const followersSnap = await getDocs(
        collection(db, 'users', currentUser.uid, 'followers')
      );
      for (const followerDoc of followersSnap.docs) {
        await addDoc(collection(db, 'notifications'), {
          userId: followerDoc.id,
          type: 'new_post',
          title: `${currentUser.name} posted`,
          message: postContent.substring(0, 80),
          fromUserId: currentUser.uid,
          fromUserName: currentUser.name,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      onClose();
    } catch (e) {
      console.error('Error posting:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end"
      onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-t-3xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
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
            className="px-4 py-1.5 bg-[#ef4444] rounded-full text-sm font-bold text-white disabled:opacity-40">
            {loading ? '...' : 'Post'}
          </button>
        </div>

        <div className="flex gap-3 px-4 py-4">
          <Avatar name={currentUser?.name || 'U'} size="md" />
          <div className="flex-1">
            <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)}
              placeholder={activeType === 'post' ? "What's happening in sports?" : "Share your prediction..."}
              rows={4}
              className="w-full bg-transparent text-white placeholder:text-[#71767b] text-base outline-none resize-none"
            />
            {imagePreview && (
              <div className="relative mt-2 rounded-2xl overflow-hidden border border-[#1f1f1f]">
                <img src={imagePreview} alt="" className="w-full max-h-64 object-cover" />
                <button onClick={() => setImagePreview(null)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
            {activeType === 'prediction' && (
              <div className="mt-3 space-y-2">
                <input placeholder="Match (e.g. Arsenal vs Chelsea)"
                  value={prediction.match} onChange={e => setPrediction(p => ({ ...p, match: e.target.value }))}
                  className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Prediction (e.g. Home Win)"
                    value={prediction.tip} onChange={e => setPrediction(p => ({ ...p, tip: e.target.value }))}
                    className="bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none"
                  />
                  <input placeholder="Odds (optional)"
                    value={prediction.odds} onChange={e => setPrediction(p => ({ ...p, odds: e.target.value }))}
                    className="bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1f1f1f]">
          <div className="flex items-center gap-1 text-[#ef4444]">
            {[
              { icon: Image, action: () => imageInputRef.current?.click() },
              { icon: Video, action: () => {} },
              { icon: BarChart2, action: () => {} },
              { icon: Smile, action: () => {} },
              { icon: MapPin, action: () => {} },
            ].map(({ icon: Icon, action }, i) => (
              <button key={i} onClick={action} className="p-2 rounded-full hover:bg-[#ef4444]/10">
                <Icon className="w-4 h-4" />
              </button>
            ))}
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
  const [localLikes, setLocalLikes] = useState(post.likes);
  const [localReposts, setLocalReposts] = useState(post.reposts);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  // Check if current user already liked/reposted/bookmarked
  useEffect(() => {
    if (!currentUserId) return;
    const checkStatus = async () => {
      const [likeDoc, repostDoc, bookmarkDoc] = await Promise.all([
        getDoc(doc(db, 'posts', post.id, 'likes', currentUserId)),
        getDoc(doc(db, 'posts', post.id, 'reposts', currentUserId)),
        getDoc(doc(db, 'users', currentUserId, 'bookmarks', post.id)),
      ]);
      setLiked(likeDoc.exists());
      setReposted(repostDoc.exists());
      setBookmarked(bookmarkDoc.exists());
    };
    checkStatus();
  }, [post.id, currentUserId]);

  const handleLike = async () => {
    if (!currentUserId) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLocalLikes(n => n + (newLiked ? 1 : -1));
    try {
      const likeRef = doc(db, 'posts', post.id, 'likes', currentUserId);
      if (newLiked) {
        await setDoc(likeRef, { userId: currentUserId, createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'posts', post.id), { likes: increment(1) });
        // Notify post author
        if (post.userId !== currentUserId) {
          const userDoc = await getDoc(doc(db, 'users', currentUserId));
          await addDoc(collection(db, 'notifications'), {
            userId: post.userId,
            type: 'like',
            title: 'New Like ❤️',
            message: `${userDoc.data()?.displayName} liked your post`,
            fromUserId: currentUserId,
            postId: post.id,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      } else {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'posts', post.id), { likes: increment(-1) });
      }
    } catch {
      setLiked(!newLiked);
      setLocalLikes(n => n + (newLiked ? -1 : 1));
    }
  };

  const handleRepost = async () => {
    if (!currentUserId) return;
    const newReposted = !reposted;
    setReposted(newReposted);
    setLocalReposts(n => n + (newReposted ? 1 : -1));
    try {
      const repostRef = doc(db, 'posts', post.id, 'reposts', currentUserId);
      if (newReposted) {
        // Save repost to user's reposts collection so it shows on profile
        await setDoc(repostRef, { userId: currentUserId, createdAt: serverTimestamp() });
        await setDoc(doc(db, 'users', currentUserId, 'reposts', post.id), {
          postId: post.id,
          originalUserId: post.userId,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'posts', post.id), { reposts: increment(1) });
        // Notify post author
        if (post.userId !== currentUserId) {
          const userDoc = await getDoc(doc(db, 'users', currentUserId));
          await addDoc(collection(db, 'notifications'), {
            userId: post.userId,
            type: 'repost',
            title: 'New Repost 🔁',
            message: `${userDoc.data()?.displayName} reposted your post`,
            fromUserId: currentUserId,
            postId: post.id,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      } else {
        await deleteDoc(repostRef);
        await deleteDoc(doc(db, 'users', currentUserId, 'reposts', post.id));
        await updateDoc(doc(db, 'posts', post.id), { reposts: increment(-1) });
      }
    } catch {
      setReposted(!newReposted);
      setLocalReposts(n => n + (newReposted ? -1 : 1));
    }
  };

  const handleBookmark = async () => {
    if (!currentUserId) return;
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    try {
      const bookmarkRef = doc(db, 'users', currentUserId, 'bookmarks', post.id);
      if (newBookmarked) {
        await setDoc(bookmarkRef, { postId: post.id, createdAt: serverTimestamp() });
      } else {
        await deleteDoc(bookmarkRef);
      }
    } catch {
      setBookmarked(!newBookmarked);
    }
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
      className="px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors">
      <div className="flex gap-3">
        <Avatar name={post.userName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="font-bold text-sm text-white">{post.userName}</span>
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

          <p className="text-sm text-[#e7e9ea] leading-relaxed mb-3 whitespace-pre-line">{post.content}</p>

          {post.image && (
            <div className="mb-3 rounded-2xl overflow-hidden border border-[#1f1f1f]">
              <img src={post.image} alt="" className="w-full max-h-80 object-cover" />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between text-[#71767b]">
            {/* Comment */}
            <button className="flex items-center gap-1.5 hover:text-[#ef4444] transition-colors group">
              <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-xs">{fmt(post.comments)}</span>
            </button>

            {/* Repost */}
            <button onClick={handleRepost}
              className={cn('flex items-center gap-1.5 transition-colors group', reposted ? 'text-green-500' : 'hover:text-green-500')}>
              <div className="p-1.5 rounded-full group-hover:bg-green-500/10">
                <Repeat2 className="w-4 h-4" />
              </div>
              <span className="text-xs">{fmt(localReposts)}</span>
            </button>

            {/* Like */}
            <button onClick={handleLike}
              className={cn('flex items-center gap-1.5 transition-colors group', liked ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}>
              <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10">
                <Heart className={cn('w-4 h-4', liked && 'fill-[#ef4444]')} />
              </div>
              <span className="text-xs">{fmt(localLikes)}</span>
            </button>

            {/* Bookmark */}
            <button onClick={handleBookmark}
              className={cn('flex items-center gap-1.5 transition-colors group', bookmarked ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}>
              <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10">
                <Bookmark className={cn('w-4 h-4', bookmarked && 'fill-[#ef4444]')} />
              </div>
            </button>

            {/* Share */}
            <button className="flex items-center gap-1.5 hover:text-[#ef4444] transition-colors group">
              <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10">
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchText, setSearchText] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showButton, setShowButton] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setCurrentUser({
            uid: user.uid,
            name: data.displayName || 'User',
            handle: `@${(data.displayName || 'user').toLowerCase().replace(/\s/g, '')}`,
            tipster: data.role === 'tipster',
            verified: data.verified || false,
          });
        }
      } else {
        setCurrentUserId(null);
        setCurrentUser(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = activeTab === 'new'
      ? firestoreQuery(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30))
      : firestoreQuery(collection(db, 'posts'), orderBy('likes', 'desc'), limit(30));
    const unsub = onSnapshot(q, snapshot => {
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

  const filtered = posts.filter(p =>
    p.content?.toLowerCase().includes(searchText.toLowerCase()) ||
    p.userName?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="flex items-center gap-1 px-4 pt-3 pb-2">
          {[
            { key: 'trending', label: '🔥 Trending' },
            { key: 'new', label: '✨ New' },
            { key: 'following', label: '👥 Following' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
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
            {searchText && <button onClick={() => setSearchText('')}><X className="w-3.5 h-3.5 text-[#71767b]" /></button>}
          </div>
        </div>
      </div>

      <LiveTicker />

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-3xl mb-3">🏟️</p>
              <p className="font-bold text-sm text-white">No posts yet</p>
              <p className="text-xs text-[#71767b] mt-1">Be the first to post!</p>
            </div>
          ) : filtered.map(post => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showButton && (
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
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
