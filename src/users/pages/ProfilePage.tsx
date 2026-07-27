import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Heart, MessageCircle, Repeat2, Share, Bookmark,
  Trophy, Upload, Settings, ChevronRight, MapPin, Calendar
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import type { AppUser } from '../../core/types';
import { db } from '../../lib/firebase';
import {
  collection, onSnapshot, query as firestoreQuery,
  where, orderBy, doc, getDoc, getDocs, setDoc,
  deleteDoc, updateDoc, increment, serverTimestamp
} from 'firebase/firestore';



// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md', image }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; image?: string }) {
  const colors = ['bg-[#ef4444]', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-20 h-20 text-3xl' };
  if (image) return <img src={image} alt={name} className={cn('rounded-full object-cover shrink-0', sizes[size])} />;
  return (
    <div className={cn('rounded-full flex items-center justify-center font-black text-white shrink-0', sizes[size], color)}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

// ── Tipsters Section ───────────────────────────────────────────────────────────
function TipstersGrid({ userId }: { userId: string }) {
  const [tipsters, setTipsters] = useState<any[]>([]);
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, 'users', userId, 'following'));
      const list: any[] = [];
      const followState: Record<string, boolean> = {};
      for (const d of snap.docs) {
        const ud = await getDoc(doc(db, 'users', d.id));
        if (ud.exists() && ud.data().role === 'tipster') {
          const data = ud.data();
          list.push({
            id: d.id,
            name: data.displayName || 'Tipster',
            handle: `@${(data.displayName || '').toLowerCase().replace(/\s/g, '')}`,
            winRate: `${data.winRate || 0}%`,
            streak: data.streak || 0,
            sport: data.sports?.[0] === 'Football' ? '⚽' : data.sports?.[0] === 'Basketball' ? '🏀' : '🎯',
          });
          followState[d.id] = true;
        }
      }
      setTipsters(list);
      setFollowing(followState);
    };
    load();
  }, [userId]);

  const handleToggle = async (tipId: string) => {
    const newFollow = !following[tipId];
    setFollowing(f => ({ ...f, [tipId]: newFollow }));
    if (newFollow) {
      await setDoc(doc(db, 'users', userId, 'following', tipId), { userId: tipId, createdAt: serverTimestamp() });
      await setDoc(doc(db, 'users', tipId, 'followers', userId), { userId, createdAt: serverTimestamp() });
    } else {
      await deleteDoc(doc(db, 'users', userId, 'following', tipId));
      await deleteDoc(doc(db, 'users', tipId, 'followers', userId));
    }
  };

  if (tipsters.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-4">
        <h3 className="text-sm font-bold text-white">Followed Tipsters</h3>
        <button className="flex items-center gap-0.5 text-xs text-[#ef4444] font-semibold">
          See all <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tipsters.map(t => (
          <div
            key={t.id}
            className="bg-[#0f0f11] border border-[#1f1f1f] rounded-2xl p-3 flex flex-col items-center gap-2 shrink-0 w-[110px]"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center font-black text-black text-base shadow-md">
                {t.name[0]}
              </div>
              <span className="absolute -bottom-1 -right-1 text-sm">{t.sport}</span>
            </div>
            <div className="text-center min-w-0 w-full">
              <p className="text-xs font-bold text-white truncate">{t.name}</p>
              <p className="text-[10px] text-green-400 font-bold mt-0.5">{t.winRate} WR</p>
            </div>
            <button
              onClick={() => handleToggle(t.id)}
              className={cn(
                'w-full h-7 text-[10px] font-bold rounded-full transition-all',
                following[t.id]
                  ? 'border border-white/20 text-[#71767b]'
                  : 'bg-[#ef4444] text-white'
              )}
            >
              {following[t.id] ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity List ──────────────────────────────────────────────────────────────
function ActivityList({ userId }: { userId: string }) {
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    const q = firestoreQuery(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      const emojiMap: Record<string, string> = {
        follow: '👥', like: '❤️', tip_result: '🎯', welcome: '🎉',
        new_post: '📝', repost: '🔁', channel_join: '📡',
      };
      const items = snap.docs.slice(0, 5).map(d => {
        const data = d.data();
        const date = data.createdAt?.toDate?.() || new Date();
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        const time = diff < 3600 ? `${Math.floor(diff / 60)}m ago` :
                     diff < 86400 ? `${Math.floor(diff / 3600)}h ago` :
                     `${Math.floor(diff / 86400)}d ago`;
        return { id: d.id, text: data.message || data.title || '', time, emoji: emojiMap[data.type] || '⚡' };
      });
      setActivity(items);
    });
    return () => unsub();
  }, [userId]);

  if (activity.length === 0) return null;

  return (
    <div className="mx-4 bg-[#0f0f11] rounded-2xl border border-[#1f1f1f] overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-[#1f1f1f]">
        <h3 className="text-sm font-bold text-white">Recent Activity</h3>
      </div>
      <div className="divide-y divide-[#1f1f1f]">
        {activity.map(item => (
          <div key={item.id} className="flex items-start gap-3 px-4 py-3">
            {/* Timeline: icon + vertical line */}
            <div className="flex flex-col items-center shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-full bg-[#1a1a1e] border border-[#2a2a30] flex items-center justify-center text-sm">
                {item.emoji}
              </div>
            </div>
            {/* Text + time */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#e7e9ea] font-medium leading-relaxed">{item.text}</p>
              <p className="text-[10px] text-[#71767b] mt-1">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Prediction Record ──────────────────────────────────────────────────────────
function PredictionRecord({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<{ outcome: string }[]>([]);
  const [stats, setStats] = useState([
    { value: '0%', label: 'Win Rate', green: false },
    { value: '0x', label: 'Avg Odds', green: false },
    { value: '0', label: 'Picks', green: false },
    { value: '0%', label: 'ROI', green: false },
  ]);

  useEffect(() => {
    const load = async () => {
      const channelsSnap = await getDocs(firestoreQuery(collection(db, 'channels'), where('ownerId', '==', userId)));
      const allTips: any[] = [];
      for (const ch of channelsSnap.docs) {
        const tipsSnap = await getDocs(firestoreQuery(collection(db, 'channels', ch.id, 'tips'), orderBy('createdAt', 'desc')));
        tipsSnap.docs.forEach(d => allTips.push(d.data()));
      }
      const settled = allTips.filter(t => t.status === 'won' || t.status === 'lost');
      const won = settled.filter(t => t.status === 'won').length;
      const lost = settled.filter(t => t.status === 'lost').length;
      const winRate = settled.length > 0 ? Math.round((won / settled.length) * 100) : 0;
      const odds = allTips.map(t => parseFloat(t.totalOdds || t.odds || '0')).filter(o => o > 0);
      const avgOdds = odds.length > 0 ? (odds.reduce((a, b) => a + b, 0) / odds.length) : 0;
      const roi = winRate >= 50 ? `+${winRate - 50}%` : `${winRate - 50}%`;
      setBadges(settled.slice(0, 8).map(t => ({ outcome: t.status === 'won' ? 'W' : 'L' })));
      setStats([
        { value: `${winRate}%`, label: 'Win Rate', green: false },
        { value: `${avgOdds.toFixed(1)}x`, label: 'Avg Odds', green: false },
        { value: String(allTips.length), label: 'Picks', green: false },
        { value: roi, label: 'ROI', green: winRate >= 50 },
      ]);
    };
    load();
  }, [userId]);

  if (badges.length === 0) return null;
  return (
    <div className="mx-4 bg-[#0f0f11] rounded-2xl border border-[#1f1f1f] overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-[#1f1f1f] flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Prediction Record</h3>
        <div className="text-[10px] font-bold text-[#71767b]">
          <span className="text-green-400">4W</span>-<span className="text-[#ef4444]">3L</span>
          {' · Streak: '}<span className="text-green-400">W2</span>
        </div>
      </div>
      {/* W/L Badges */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {badges.map((b, i) => (
          <div
            key={i}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0',
              b.outcome === 'W' ? 'bg-green-500' : 'bg-[#ef4444]'
            )}
          >
            {b.outcome}
          </div>
        ))}
      </div>
      {/* Stats */}
      <div className="grid grid-cols-4 border-t border-[#1f1f1f]">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn('py-3 text-center', i < 3 && 'border-r border-[#1f1f1f]')}
          >
            <p className={cn('text-base font-black', s.green ? 'text-green-400' : 'text-white')}>{s.value}</p>
            <p className="text-[9px] text-[#71767b] font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab({ userId, isTipster, onBecomeTipster }: { userId: string; isTipster: boolean; onBecomeTipster: () => void }) {
  return (
    <div className="w-full flex flex-col gap-4 py-4">
      <TipstersGrid userId={userId} />
      <ActivityList userId={userId} />
      <PredictionRecord userId={userId} />
      {!isTipster && (
        <div className="mx-4 bg-gradient-to-br from-[#ef4444]/15 to-[#dc2626]/8 border border-[#ef4444]/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="w-4 h-4 text-[#ef4444]" />
            <p className="text-sm font-bold text-white">Become a Tipster</p>
          </div>
          <p className="text-xs text-[#71767b] mb-3 leading-relaxed">
            Share your expertise, build a channel and earn from your predictions.
          </p>
          <button
            onClick={onBecomeTipster}
            className="w-full py-2.5 bg-[#ef4444] rounded-xl text-xs font-bold text-white hover:bg-[#dc2626] transition-colors"
          >
            Apply Now
          </button>
        </div>
      )}
    </div>
  );
}

// ── Posts Tab ──────────────────────────────────────────────────────────────────
function PostsTab({ appUser }: { appUser: AppUser }) {
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const q = firestoreQuery(collection(db, 'posts'), where('userId', '==', appUser.id), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setMyPosts(snap.docs.map(d => {
        const data = d.data();
        const date = data.createdAt?.toDate?.() || new Date();
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        const time = diff < 3600 ? `${Math.floor(diff / 60)}m ago` : diff < 86400 ? `${Math.floor(diff / 3600)}h ago` : `${Math.floor(diff / 86400)}d ago`;
        return { id: d.id, ...data, time };
      }));
    });
    return () => unsub();
  }, [appUser.id]);

  const handleLike = async (postId: string, currentLikes: number) => {
    const newLiked = !likedPosts[postId];
    setLikedPosts(p => ({ ...p, [postId]: newLiked }));
    const likeRef = doc(db, 'posts', postId, 'likes', appUser.id);
    if (newLiked) {
      await setDoc(likeRef, { userId: appUser.id, createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'posts', postId), { likes: increment(1) });
    } else {
      await deleteDoc(likeRef);
      await updateDoc(doc(db, 'posts', postId), { likes: increment(-1) });
    }
  };
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  return (
    <div className="w-full">
      {myPosts.map((post, i) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="px-4 py-3.5 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex gap-3">
            <Avatar name={appUser.name} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="font-bold text-sm text-white leading-tight">{appUser.name}</span>
                {appUser.role === 'tipster' && (
                  <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded-full font-bold">TIPSTER</span>
                )}
                <span className="text-[#71767b] text-xs">{post.time}</span>
              </div>
              <p className="text-sm text-[#e7e9ea] leading-relaxed mb-3">{post.content}</p>
              <div className="flex items-center justify-between text-[#71767b]">
                <button className="flex items-center gap-1 hover:text-[#ef4444] transition-colors p-1">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs">{fmt(post.comments)}</span>
                </button>
                <button className="flex items-center gap-1 hover:text-green-500 transition-colors p-1">
                  <Repeat2 className="w-4 h-4" />
                  <span className="text-xs">{fmt(post.reposts)}</span>
                </button>
                <button
                  onClick={() => setLiked(l => ({ ...l, [post.id]: !l[post.id] }))}
                  className={cn('flex items-center gap-1 transition-colors p-1', liked[post.id] ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}
                >
                  <Heart className={cn('w-4 h-4', liked[post.id] && 'fill-[#ef4444]')} />
                  <span className="text-xs">{fmt(post.likes + (liked[post.id] ? 1 : 0))}</span>
                </button>
                <button
                  onClick={() => setBookmarked(b => ({ ...b, [post.id]: !b[post.id] }))}
                  className={cn('flex items-center gap-1 transition-colors p-1', bookmarked[post.id] ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}
                >
                  <Bookmark className={cn('w-4 h-4', bookmarked[post.id] && 'fill-[#ef4444]')} />
                </button>
                <button className="p-1 hover:text-[#ef4444] transition-colors">
                  <Share className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── People Tab ─────────────────────────────────────────────────────────────────
function PeopleTab({ userId, type }: { userId: string; type: 'followers' | 'following' }) {
  const [people, setPeople] = useState<any[]>([]);
  const [followState, setFollowState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, 'users', userId, type));
      const list: any[] = [];
      const state: Record<string, boolean> = {};
      for (const d of snap.docs) {
        const ud = await getDoc(doc(db, 'users', d.id));
        if (ud.exists()) {
          const data = ud.data();
          list.push({ id: d.id, name: data.displayName || 'User', handle: `@${(data.displayName || '').toLowerCase().replace(/\s/g, '')}`, verified: data.verified || false });
          const followCheck = await getDoc(doc(db, 'users', userId, 'following', d.id));
          state[d.id] = followCheck.exists();
        }
      }
      setPeople(list);
      setFollowState(state);
    };
    load();
  }, [userId, type]);

  return (
    <div className="w-full">
      {people.map((f, i) => (
        <motion.div
          key={f.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center justify-between px-4 py-3.5 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar name={f.name} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-sm text-white truncate">{f.name}</p>
                {f.verified && (
                  <div className="w-4 h-4 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0">
                    <Zap className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <p className="text-xs text-[#71767b]">{f.handle}</p>
            </div>
          </div>
          <button
            onClick={async () => {
                const newF = !followState[f.id];
                setFollowState(s => ({ ...s, [f.id]: newF }));
                if (newF) {
                  await setDoc(doc(db, 'users', userId, 'following', f.id), { userId: f.id, createdAt: serverTimestamp() });
                } else {
                  await deleteDoc(doc(db, 'users', userId, 'following', f.id));
                }
              }}
            className={cn(
              'ml-3 px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0',
              followState[f.id] ? 'border border-white/20 text-white' : 'bg-white text-black hover:bg-white/90'
            )}
          >
            {followState[f.id] ? 'Following ✓' : 'Follow'}
          </button>
        </motion.div>
      ))}
    </div>
  );
}

// ── Subscriptions Tab ──────────────────────────────────────────────────────────
function SubscriptionsTab({ userId }: { userId: string }) {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const channelsSnap = await getDocs(collection(db, 'channels'));
      const subs: any[] = [];
      for (const ch of channelsSnap.docs) {
        const memberDoc = await getDoc(doc(db, 'channels', ch.id, 'members', userId));
        if (memberDoc.exists()) {
          const data = ch.data();
          subs.push({
            id: ch.id,
            name: data.name || 'Channel',
            handle: `@${(data.name || '').toLowerCase().replace(/\s/g, '')}`,
            price: data.type === 'paid' ? `₦${(data.price || 0).toLocaleString()}/mo` : 'Free',
            winRate: `${data.winRate || 0}%`,
            type: data.type || 'free',
          });
        }
      }
      setSubscriptions(subs);
    };
    load();
  }, [userId]);
  return (
    <div className="w-full p-4 space-y-3">
      {subscriptions.map((sub, i) => (
        <motion.div
          key={sub.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-[#0f0f11] border border-[#1f1f1f] rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={sub.name} size="md" />
              <div className="min-w-0">
                <p className="font-bold text-sm text-white truncate">{sub.name}</p>
                <p className="text-xs text-[#71767b]">{sub.handle}</p>
              </div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full',
                sub.type === 'paid' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
              )}>
                {sub.type === 'paid' ? 'VIP' : 'FREE'}
              </span>
              <p className="text-sm font-black text-white mt-1">{sub.price}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-400 font-bold">{sub.winRate} Win Rate</span>
            <button className="px-3 py-1.5 border border-[#ef4444]/30 text-[#ef4444] text-xs font-bold rounded-full hover:bg-[#ef4444]/10 transition-colors">
              Manage
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Edit Profile Bottom Sheet ──────────────────────────────────────────────────
function EditProfileSheet({
  open, onClose, editForm, setEditForm, previewImage, setPreviewImage, onSave
}: {
  open: boolean;
  onClose: () => void;
  editForm: { name: string; bio: string; location: string };
  setEditForm: React.Dispatch<React.SetStateAction<{ name: string; bio: string; location: string }>>;
  previewImage: string | undefined;
  setPreviewImage: (v: string | undefined) => void;
  onSave: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = ev => setPreviewImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="relative z-10 w-full bg-[#0d0d0f] border-t border-[#2a2a30] rounded-t-3xl overflow-hidden flex flex-col max-h-[90dvh]"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1f1f1f] shrink-0">
              <button onClick={onClose} className="text-sm text-[#71767b] hover:text-white transition-colors font-semibold">
                Cancel
              </button>
              <h3 className="text-base font-black text-white">Edit Profile</h3>
              <button
                onClick={onSave}
                className="text-sm text-[#ef4444] font-black hover:text-[#f87171] transition-colors"
              >
                Save
              </button>
            </div>

            {/* Scrollable form body */}
            <div
              className="flex-1 overflow-y-auto p-5 space-y-5"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Avatar section */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-[#ef4444]/20 cursor-pointer group"
                  onClick={() => fileRef.current?.click()}
                >
                  <Avatar name={editForm.name || 'U'} size="xl" image={previewImage} />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                <div className="flex gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="px-4 py-1.5 rounded-full border border-[#1f1f1f] text-xs font-bold text-white hover:bg-white/5 transition-colors"
                  >
                    Change Photo
                  </button>
                  {previewImage && (
                    <button
                      onClick={() => setPreviewImage(undefined)}
                      className="px-4 py-1.5 rounded-full border border-[#ef4444]/30 text-[#ef4444] text-xs font-bold hover:bg-[#ef4444]/8 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[10px] font-bold text-[#71767b] uppercase tracking-widest mb-2 block">
                  Display Name
                </label>
                <input
                  value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-[#16161a] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-2xl px-4 py-3 text-sm text-white outline-none transition-all"
                  placeholder="Your display name"
                  maxLength={50}
                />
                <p className="text-[10px] text-[#71767b] text-right mt-1">{editForm.name.length}/50</p>
              </div>

              {/* Bio */}
              <div>
                <label className="text-[10px] font-bold text-[#71767b] uppercase tracking-widest mb-2 block">
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                  rows={3}
                  maxLength={160}
                  className="w-full bg-[#16161a] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-2xl px-4 py-3 text-sm text-white outline-none resize-none transition-all"
                  placeholder="Tell people about yourself..."
                />
                <p className="text-[10px] text-[#71767b] text-right mt-1">{editForm.bio.length}/160</p>
              </div>

              {/* Location */}
              <div>
                <label className="text-[10px] font-bold text-[#71767b] uppercase tracking-widest mb-2 block">
                  Location
                </label>
                <div className="flex items-center gap-2 bg-[#16161a] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-2xl px-4 py-3 transition-all">
                  <MapPin className="w-4 h-4 text-[#71767b] shrink-0" />
                  <input
                    value={editForm.location}
                    onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))}
                    className="flex-1 bg-transparent text-sm text-white outline-none"
                    placeholder="Your location"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Tab config ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'Overview', label: 'Overview' },
  { key: 'Posts', label: 'Posts' },
  { key: 'Following', label: 'Following' },
  { key: 'Followers', label: 'Followers' },
  { key: 'Subscriptions', label: 'Subs' },
];

// ── Profile Page ───────────────────────────────────────────────────────────────
interface ProfilePageProps { appUser: AppUser; }

export function ProfilePage({ appUser }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [editOpen, setEditOpen] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [_subsCount, _setSubsCount] = useState(0);

  useEffect(() => {
    if (!appUser.id) return;
    const loadCounts = async () => {
      const [frs, fing] = await Promise.all([
        getDocs(collection(db, 'users', appUser.id, 'followers')),
        getDocs(collection(db, 'users', appUser.id, 'following')),
      ]);
      setFollowersCount(frs.size);
      setFollowingCount(fing.size);
    };
    loadCounts();
  }, [appUser.id]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | undefined>(appUser.profilePicture);
  const [editForm, setEditForm] = useState({
    name: appUser.name ?? '',
    bio: 'Sports fan. Love predictions and good vibes. ⚽🏆',
    location: 'Lagos, Nigeria',
  });

  const navigate = useNavigate();
  const isTipster = appUser.role === 'tipster';

  const handleBecomeTipster = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    navigate('/become-tipster');
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, 'users', appUser.id), {
        displayName: editForm.name?.trim() || appUser.name,
        bio: editForm.bio?.trim() || '',
        location: editForm.location?.trim() || '',
        ...(previewImage ? { profilePicture: previewImage } : {}),
      });
    } catch (e) { console.error('Error saving profile:', e); }
    setEditOpen(false);
  };

  return (
    <div className="w-full min-h-full bg-black selection:bg-[#ef4444]/30">

      {/* Page header — desktop only; mobile uses global header */}
      <div className="hidden md:block sticky top-0 z-30 w-full bg-black/95 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="flex items-center h-14 px-4">
          <div className="w-10 shrink-0" />
          <h1 className="flex-1 text-center text-base font-black text-white">Profile</h1>
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/8 text-white transition-colors shrink-0"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile quick actions */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
        <h1 className="text-base font-black text-white">Profile</h1>
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-full hover:bg-white/8 text-white transition-colors min-h-touch min-w-touch flex items-center justify-center"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* ── Profile Hero ── */}
      <div className="w-full border-b border-[#1f1f1f]">
        {/* Avatar + name block — fully centered */}
        <div className="flex flex-col items-center pt-7 pb-5 px-5 w-full">

          {/* Avatar */}
          <div className="ring-[3px] ring-[#ef4444]/20 rounded-full shadow-xl mb-4 shrink-0">
            <Avatar name={appUser.name || 'U'} size="xl" image={previewImage} />
          </div>

          {/* Name + handle */}
          <h2 className="text-xl font-black text-white text-center leading-tight w-full">
            {appUser.name || 'Arena Fan'}
          </h2>
          <p className="text-sm text-[#71767b] text-center mt-0.5 w-full">
            {appUser.handle || '@user'}
          </p>

          {/* Tipster badge */}
          {isTipster && (
            <div className="mt-2 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-3 py-1">
              <Trophy className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Verified Tipster</span>
            </div>
          )}

          {/* Bio */}
          <p className="text-sm text-[#b0b3b8] text-center leading-relaxed mt-3 w-full max-w-xs">
            {editForm.bio}
          </p>

          {/* Location + join date */}
          <div className="flex items-center gap-4 mt-2.5 text-[#71767b]">
            {editForm.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="text-xs">{editForm.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span className="text-xs">Joined June 2024</span>
            </div>
          </div>

          {/* Stats row — full width, evenly spaced */}
          <div className="flex w-full max-w-xs mt-5 border border-[#1f1f1f] rounded-2xl overflow-hidden bg-[#0f0f11]">
            {[
              { value: String(followersCount), label: 'Followers' },
              { value: String(followingCount), label: 'Following' },
              { value: '3', label: 'Subscribed' },
            ].map((s, i) => (
              <button
                key={s.label}
                onClick={() => setActiveTab(i === 0 ? 'Followers' : i === 1 ? 'Following' : 'Subscriptions')}
                className={cn(
                  'flex-1 py-3 flex flex-col items-center hover:bg-white/5 active:bg-white/8 transition-colors',
                  i < 2 && 'border-r border-[#1f1f1f]'
                )}
              >
                <span className="text-sm font-black text-white">{s.value}</span>
                <span className="text-[10px] text-[#71767b] mt-0.5">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5 mt-5 w-full max-w-xs">
            <button
              onClick={() => setEditOpen(true)}
              className="flex-1 h-10 rounded-full border border-[#2a2a30] text-xs font-bold text-white hover:bg-white/5 active:scale-95 transition-all"
            >
              Edit Profile
            </button>
            {!isTipster && (
              <button
                onClick={handleBecomeTipster}
                disabled={isNavigating}
                className="flex-1 h-10 rounded-full bg-white text-xs font-black text-black hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                {isNavigating ? 'Loading...' : 'Become Tipster'}
              </button>
            )}
            {isTipster && (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 h-10 rounded-full bg-yellow-500 text-xs font-black text-black hover:bg-yellow-400 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5" />
                Dashboard
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div
        className="w-full flex border-b border-[#1f1f1f] overflow-x-auto scrollbar-none sticky top-0 z-20 bg-black"
      >
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all min-w-0 text-center',
              activeTab === tab.key
                ? 'border-[#ef4444] text-[#ef4444]'
                : 'border-transparent text-[#71767b] hover:text-white/80'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="w-full"
        >
          {activeTab === 'Overview'       && <OverviewTab userId={appUser.id} isTipster={isTipster} onBecomeTipster={handleBecomeTipster} />}
          {activeTab === 'Posts'          && <PostsTab appUser={appUser} />}
          {activeTab === 'Following'      && <PeopleTab userId={appUser.id} type='following' />}
          {activeTab === 'Followers'      && <PeopleTab userId={appUser.id} type='followers' />}
          {activeTab === 'Subscriptions'  && <SubscriptionsTab userId={appUser.id} />}
        </motion.div>
      </AnimatePresence>

      {/* ── Edit Profile Bottom Sheet ── */}
      <EditProfileSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editForm={editForm}
        setEditForm={setEditForm}
        previewImage={previewImage}
        setPreviewImage={setPreviewImage}
        onSave={handleSave}
      />
    </div>
  );
}