import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Heart, MessageCircle, Repeat2, Share, Bookmark, Upload, X, Settings, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import type { AppUser } from '../../core/types';
import { db } from '../../lib/firebase';
import {
  doc, getDoc, updateDoc, collection, query as firestoreQuery,
  where, orderBy, getDocs, setDoc, deleteDoc, increment, serverTimestamp
} from 'firebase/firestore';

interface TipsterFollow { id: string; name: string; handle: string; winRate: string; streak: number; }
interface ActivityItem { id: string; text: string; time: any; emoji: string; }
interface PostItem { id: string; content: string; createdAt: any; likes: number; comments: number; reposts: number; }
interface FollowerItem { id: string; name: string; handle: string; verified: boolean; }
interface SubscriptionItem { id: string; name: string; handle: string; price: string; winRate: string; type: 'paid' | 'free'; }
interface MatchBadge { outcome: 'W' | 'L'; label: string; }

function Avatar({ name, size = 'md', image }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; image?: string }) {
  const colors = ['bg-[#ef4444]', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-24 h-24 text-4xl' };
  if (image) return <img src={image} alt={name} className={cn('rounded-full object-cover shrink-0', sizes[size])} />;
  return (
    <div className={cn('rounded-full flex items-center justify-center font-black text-white shrink-0', sizes[size], color)}>
      {name[0]?.toUpperCase() || 'U'}
    </div>
  );
}

function timeAgo(timestamp: any) {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function TipstersGrid({ userId }: { userId: string }) {
  const [tipsters, setTipsters] = useState<TipsterFollow[]>([]);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const followingSnap = await getDocs(collection(db, 'users', userId, 'following'));
        const list: TipsterFollow[] = [];
        const followState: Record<string, boolean> = {};
        for (const followDoc of followingSnap.docs) {
          const tipsterId = followDoc.id;
          const tipsterDoc = await getDoc(doc(db, 'users', tipsterId));
          if (tipsterDoc.exists() && tipsterDoc.data().role === 'tipster') {
            const data = tipsterDoc.data();
            list.push({
              id: tipsterId,
              name: data.displayName || 'Tipster',
              handle: `@${(data.displayName || 'tipster').toLowerCase().replace(/\s/g, '')}`,
              winRate: `${data.winRate || 0}%`,
              streak: data.streak || 0,
            });
            followState[tipsterId] = true;
          }
        }
        setTipsters(list);
        setFollowing(followState);
      } catch (e) { console.error('Error loading followed tipsters:', e); }
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleUnfollow = async (tipsterId: string) => {
    setFollowing(f => ({ ...f, [tipsterId]: false }));
    try {
      await deleteDoc(doc(db, 'users', userId, 'following', tipsterId));
      await deleteDoc(doc(db, 'users', tipsterId, 'followers', userId));
      await updateDoc(doc(db, 'users', tipsterId), { followersCount: increment(-1) });
    } catch (e) { setFollowing(f => ({ ...f, [tipsterId]: true })); }
  };

  if (loading || tipsters.length === 0) return null;

  return (
    <div className="py-2">
      <h3 className="text-base font-bold text-white mb-3">Followed Tipsters</h3>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {tipsters.map(t => (
          <div key={t.id} className="bg-[#0b0c0e] p-3 rounded-2xl border border-[#1f1f1f] flex items-center justify-between min-w-[245px] w-[245px] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 flex items-center justify-center font-black text-black text-sm shrink-0 shadow-md">
                {t.name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate leading-tight">{t.name}</p>
                <p className="text-xs text-green-400 font-bold mt-0.5">{t.winRate} WR 🔥</p>
              </div>
            </div>
            <button onClick={() => handleUnfollow(t.id)}
              className={cn('h-8 px-4 text-xs font-bold rounded-full transition-all shrink-0', following[t.id] ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]' : 'border border-white/20 text-[#71767b]')}>
              {following[t.id] ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityList({ userId }: { userId: string }) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const q = firestoreQuery(collection(db, 'notifications'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const items: ActivityItem[] = snap.docs.slice(0, 5).map(d => {
          const data = d.data();
          const emojiMap: Record<string, string> = {
            follow: '👥', like: '❤️', tip_result: '🎯', new_payment: '💰',
            channel_join: '📡', welcome: '🎉', new_post: '📝', repost: '🔁',
          };
          return { id: d.id, text: data.message || data.title || 'Activity', time: data.createdAt, emoji: emojiMap[data.type] || '⚡' };
        });
        setActivity(items);
      } catch (e) { console.error('Error loading activity:', e); }
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading || activity.length === 0) return null;

  return (
    <div className="bg-[#0b0c0e] p-4 rounded-2xl border border-[#1f1f1f] relative">
      <h3 className="mb-4 text-base font-bold text-white">Recent Activity</h3>
      <div className="absolute right-[54px] top-[74px] bottom-[34px] w-[1px] bg-[#1f1f1f] z-0" />
      <div className="space-y-4">
        {activity.map(item => (
          <div key={item.id} className="flex items-center gap-3 relative z-10">
            <div className="w-8 h-8 rounded-full bg-[#16171a] flex items-center justify-center text-sm shrink-0 border border-[#1f1f1f]">{item.emoji}</div>
            <div className="flex-1 min-w-0 pr-8"><p className="text-xs md:text-sm text-[#e7e9ea] truncate font-medium">{item.text}</p></div>
            <div className="absolute right-[49px] w-2.5 h-2.5 rounded-full bg-[#ef4444] border border-black shrink-0" />
            <span className="text-xs text-[#71767b] w-8 text-right shrink-0">{timeAgo(item.time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PredictionRecord({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<MatchBadge[]>([]);
  const [stats, setStats] = useState({ winRate: 0, avgOdds: 0, total: 0, won: 0, lost: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
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
        const oddsList = allTips.map(t => parseFloat(t.totalOdds || t.odds || '0')).filter(o => o > 0);
        const avgOdds = oddsList.length > 0 ? (oddsList.reduce((a, b) => a + b, 0) / oddsList.length) : 0;
        setBadges(settled.slice(0, 8).map(t => ({
          outcome: t.status === 'won' ? 'W' : 'L',
          label: t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('en', { month: '2-digit', day: '2-digit' }) : '',
        })));
        setStats({ winRate, avgOdds, total: allTips.length, won, lost });
      } catch (e) { console.error('Error loading prediction record:', e); }
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading || stats.total === 0) return null;

  const statsDisplay = [
    { value: `${stats.winRate}%`, label: '% WR', isGreen: false },
    { value: stats.avgOdds.toFixed(1), label: 'Avg Odds', isGreen: false },
    { value: String(stats.total), label: 'Predictions', isGreen: false },
    { value: stats.winRate >= 50 ? `+${stats.winRate - 50}%` : `${stats.winRate - 50}%`, label: 'ROI', isGreen: stats.winRate >= 50 },
  ];

  return (
    <div className="bg-[#0b0c0e] p-4 rounded-2xl border border-[#1f1f1f]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-base font-bold text-white">Prediction Record</h3>
        <div className="text-xs font-semibold text-[#71767b]">
          Record: <span className="text-green-500 font-bold">{stats.won}W</span>-<span className="text-[#ef4444] font-bold">{stats.lost}L</span>
        </div>
      </div>
      {badges.length > 0 && (
        <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none pb-4 border-b border-[#1f1f1f] mb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {badges.map((b, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 min-w-[36px]">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm', b.outcome === 'W' ? 'bg-green-500' : 'bg-[#ef4444]')}>{b.outcome}</div>
              <span className="text-[10px] text-[#71767b] font-medium">{b.label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-4 gap-2 text-center">
        {statsDisplay.map(s => (
          <div key={s.label}>
            <p className={cn('text-lg font-black', s.isGreen ? 'text-green-400' : 'text-white')}>{s.value}</p>
            <p className="text-[10px] text-[#71767b] font-bold mt-0.5 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ userId, isTipster, onBecomeTipster }: { userId: string; isTipster: boolean; onBecomeTipster: () => void }) {
  return (
    <div className="flex flex-col gap-4 mt-4 max-w-2xl mx-auto">
      <TipstersGrid userId={userId} />
      <ActivityList userId={userId} />
      {isTipster && <PredictionRecord userId={userId} />}
      {!isTipster && (
        <div className="bg-gradient-to-br from-[#ef4444]/20 to-[#dc2626]/10 border border-[#ef4444]/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-[#ef4444]" /><p className="text-sm font-bold text-white">Become a Tipster</p></div>
          <p className="text-xs text-[#71767b] mb-3 leading-relaxed">Share your expertise, build a channel and earn from your predictions.</p>
          <button onClick={onBecomeTipster} className="w-full py-2 bg-[#ef4444] rounded-xl text-xs font-bold text-white hover:bg-[#dc2626] transition-colors">Apply Now</button>
        </div>
      )}
    </div>
  );
}

function PostsTab({ appUser }: { appUser: AppUser }) {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  useEffect(() => {
    const load = async () => {
      try {
        const q = firestoreQuery(collection(db, 'posts'), where('userId', '==', appUser.id), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as PostItem)));
        const likedMap: Record<string, boolean> = {};
        for (const p of snap.docs) {
          const likeDoc = await getDoc(doc(db, 'posts', p.id, 'likes', appUser.id));
          if (likeDoc.exists()) likedMap[p.id] = true;
        }
        setLiked(likedMap);
      } catch (e) { console.error('Error loading posts:', e); }
      setLoading(false);
    };
    if (appUser.id) load();
  }, [appUser.id]);

  const handleLike = async (postId: string, currentLikes: number) => {
    const newLiked = !liked[postId];
    setLiked(l => ({ ...l, [postId]: newLiked }));
    setPosts(p => p.map(post => post.id === postId ? { ...post, likes: currentLikes + (newLiked ? 1 : -1) } : post));
    try {
      const likeRef = doc(db, 'posts', postId, 'likes', appUser.id);
      if (newLiked) {
        await setDoc(likeRef, { userId: appUser.id, createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'posts', postId), { likes: increment(1) });
      } else {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'posts', postId), { likes: increment(-1) });
      }
    } catch (e) { setLiked(l => ({ ...l, [postId]: !newLiked })); }
  };

  const handleBookmark = async (postId: string) => {
    const newBookmarked = !bookmarked[postId];
    setBookmarked(b => ({ ...b, [postId]: newBookmarked }));
    try {
      const bookmarkRef = doc(db, 'users', appUser.id, 'bookmarks', postId);
      if (newBookmarked) await setDoc(bookmarkRef, { postId, createdAt: serverTimestamp() });
      else await deleteDoc(bookmarkRef);
    } catch (e) { setBookmarked(b => ({ ...b, [postId]: !newBookmarked })); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" /></div>;
  if (posts.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <p className="text-2xl mb-2">📝</p><p className="font-bold text-sm text-white">No posts yet</p>
      <p className="text-xs text-[#71767b] mt-1">Posts you share will appear here</p>
    </div>
  );

  return (
    <div className="mt-2">
      {posts.map((post, i) => (
        <motion.div key={post.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors cursor-pointer">
          <div className="flex gap-3">
            <Avatar name={appUser.name} size="md" image={appUser.profilePicture} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="font-bold text-sm text-white">{appUser.name}</span>
                {appUser.role === 'tipster' && <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded-full font-bold">TIPSTER</span>}
                <span className="text-[#71767b] text-xs">{timeAgo(post.createdAt)}</span>
              </div>
              <p className="text-sm text-[#e7e9ea] leading-relaxed mb-3">{post.content}</p>
              <div className="flex items-center justify-between text-[#71767b]">
                <button className="flex items-center gap-1.5 hover:text-[#ef4444] transition-colors group">
                  <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10"><MessageCircle className="w-4 h-4" /></div>
                  <span className="text-xs">{fmt(post.comments || 0)}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-green-500 transition-colors group">
                  <div className="p-1.5 rounded-full group-hover:bg-green-500/10"><Repeat2 className="w-4 h-4" /></div>
                  <span className="text-xs">{fmt(post.reposts || 0)}</span>
                </button>
                <button onClick={() => handleLike(post.id, post.likes || 0)} className={cn('flex items-center gap-1.5 transition-colors group', liked[post.id] ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}>
                  <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10"><Heart className={cn('w-4 h-4', liked[post.id] && 'fill-[#ef4444]')} /></div>
                  <span className="text-xs">{fmt(post.likes || 0)}</span>
                </button>
                <button onClick={() => handleBookmark(post.id)} className={cn('flex items-center gap-1.5 transition-colors group', bookmarked[post.id] ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}>
                  <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10"><Bookmark className={cn('w-4 h-4', bookmarked[post.id] && 'fill-[#ef4444]')} /></div>
                </button>
                <button className="flex items-center gap-1.5 hover:text-[#ef4444] transition-colors group">
                  <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10"><Share className="w-4 h-4" /></div>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PeopleTab({ userId, type }: { userId: string; type: 'followers' | 'following' }) {
  const [people, setPeople] = useState<FollowerItem[]>([]);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'users', userId, type));
        const list: FollowerItem[] = [];
        const followState: Record<string, boolean> = {};
        for (const personDoc of snap.docs) {
          const personId = personDoc.id;
          const userDoc = await getDoc(doc(db, 'users', personId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            list.push({ id: personId, name: data.displayName || 'User', handle: `@${(data.displayName || 'user').toLowerCase().replace(/\s/g, '')}`, verified: data.verified || false });
            const followCheck = await getDoc(doc(db, 'users', userId, 'following', personId));
            followState[personId] = followCheck.exists();
          }
        }
        setPeople(list);
        setFollowing(followState);
      } catch (e) { console.error(`Error loading ${type}:`, e); }
      setLoading(false);
    };
    load();
  }, [userId, type]);

  const handleToggleFollow = async (personId: string) => {
    const newFollowing = !following[personId];
    setFollowing(f => ({ ...f, [personId]: newFollowing }));
    try {
      if (newFollowing) {
        await setDoc(doc(db, 'users', userId, 'following', personId), { userId: personId, createdAt: serverTimestamp() });
        await setDoc(doc(db, 'users', personId, 'followers', userId), { userId, createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'users', personId), { followersCount: increment(1) });
      } else {
        await deleteDoc(doc(db, 'users', userId, 'following', personId));
        await deleteDoc(doc(db, 'users', personId, 'followers', userId));
        await updateDoc(doc(db, 'users', personId), { followersCount: increment(-1) });
      }
    } catch (e) { setFollowing(f => ({ ...f, [personId]: !newFollowing })); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" /></div>;
  if (people.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <p className="text-2xl mb-2">{type === 'followers' ? '👥' : '🔍'}</p><p className="font-bold text-sm text-white">No {type} yet</p>
    </div>
  );

  return (
    <div className="mt-2">
      {people.map((f, i) => (
        <motion.div key={f.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-3">
            <Avatar name={f.name} size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-sm text-white">{f.name}</p>
                {f.verified && <div className="w-4 h-4 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0"><Zap className="w-2.5 h-2.5 text-white" /></div>}
              </div>
              <p className="text-xs text-[#71767b]">{f.handle}</p>
            </div>
          </div>
          <button onClick={() => handleToggleFollow(f.id)} className={cn('px-3 py-1.5 rounded-full text-xs font-bold transition-all', following[f.id] ? 'border border-white/20 text-white' : 'bg-white text-black hover:bg-white/90')}>
            {following[f.id] ? 'Following ✓' : 'Follow'}
          </button>
        </motion.div>
      ))}
    </div>
  );
}

function SubscriptionsTab({ userId }: { userId: string }) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const channelsSnap = await getDocs(collection(db, 'channels'));
        const subs: SubscriptionItem[] = [];
        for (const channelDoc of channelsSnap.docs) {
          const memberDoc = await getDoc(doc(db, 'channels', channelDoc.id, 'members', userId));
          if (memberDoc.exists()) {
            const ch = channelDoc.data();
            subs.push({
              id: channelDoc.id,
              name: ch.name || 'Channel',
              handle: ch.handle || `@${(ch.name || '').toLowerCase().replace(/\s/g, '')}`,
              price: ch.type === 'paid' ? `₦${(ch.price || 0).toLocaleString()}/${ch.subscriptionDuration === 'weekly' ? 'wk' : ch.subscriptionDuration === '2weeks' ? '2wks' : 'mo'}` : 'Free',
              winRate: ch.winRate || '0%',
              type: ch.type || 'free',
            });
          }
        }
        setSubscriptions(subs);
      } catch (e) { console.error('Error loading subscriptions:', e); }
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" /></div>;
  if (subscriptions.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <p className="text-2xl mb-2">📡</p><p className="font-bold text-sm text-white">No subscriptions yet</p>
      <p className="text-xs text-[#71767b] mt-1">Channels you join will appear here</p>
    </div>
  );

  return (
    <div className="mt-2 p-4 space-y-3">
      {subscriptions.map((sub, i) => (
        <motion.div key={sub.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="bg-[#12121A] border border-[#1f1f1f] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar name={sub.name} size="md" />
              <div><p className="font-bold text-sm text-white">{sub.name}</p><p className="text-xs text-[#71767b]">{sub.handle}</p></div>
            </div>
            <div className="text-right">
              <p className={cn('text-xs font-bold px-2 py-0.5 rounded-full', sub.type === 'paid' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400')}>{sub.type === 'paid' ? 'VIP' : 'FREE'}</p>
              <p className="text-sm font-black text-white mt-1">{sub.price}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-400 font-bold">{sub.winRate} Win Rate</span>
            <button className="px-3 py-1.5 border border-[#ef4444]/30 text-[#ef4444] text-xs font-bold rounded-full hover:bg-[#ef4444]/10 transition-colors">Manage</button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function EditProfileModal({ appUser, previewImage, editForm, onClose, onSave, onPictureChange, onRemovePicture, setEditForm }: {
  appUser: AppUser; previewImage?: string; editForm: { name: string; bio: string; profilePicture?: string };
  onClose: () => void; onSave: () => void; onPictureChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePicture: () => void; setEditForm: React.Dispatch<React.SetStateAction<{ name: string; bio: string; profilePicture?: string }>>;
}) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', appUser.id), {
        displayName: editForm.name.trim(),
        bio: editForm.bio.trim(),
        ...(editForm.profilePicture ? { profilePicture: editForm.profilePicture } : {}),
      });
      onSave();
    } catch (e) { console.error('Error saving profile:', e); }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()} className="w-full bg-[#0d0d0d] border-t border-[#1f1f1f] rounded-t-3xl px-5 pt-4 pb-10">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-white text-base">Edit Profile</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5"><X className="w-4 h-4 text-white/60" /></button>
        </div>
        <div className="flex flex-col items-center mb-5">
          <div className="relative">
            <Avatar name={editForm.name || 'U'} size="xl" image={previewImage} />
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#ef4444] rounded-full flex items-center justify-center cursor-pointer">
              <Upload className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={onPictureChange} />
            </label>
          </div>
          {previewImage && <button onClick={onRemovePicture} className="text-xs text-[#ef4444] mt-2 font-semibold">Remove photo</button>}
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#71767b] mb-1 block">Display Name</label>
            <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-all" />
          </div>
          <div>
            <label className="text-xs text-[#71767b] mb-1 block">Bio</label>
            <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} rows={3}
              className="w-full bg-white/5 border border-white/10 focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none transition-all" />
          </div>
          <button onClick={handleSave} disabled={saving || !editForm.name.trim()}
            className="w-full py-3 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ProfilePageProps { appUser: AppUser; }

export function ProfilePage({ appUser }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [editMode, setEditMode] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [bio, setBio] = useState('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editForm, setEditForm] = useState({ name: appUser.name, bio: '', profilePicture: appUser.profilePicture });
  const navigate = useNavigate();
  const isTipster = appUser.role === 'tipster';

  const tabs = ['Overview', 'Posts', 'Following', 'Followers', ...(isTipster ? [] : ['Subscriptions'])];

  useEffect(() => {
    const load = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', appUser.id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setBio(data.bio || '');
          setEditForm(f => ({ ...f, bio: data.bio || '' }));
        }
        const [followersSnap, followingSnap] = await Promise.all([
          getDocs(collection(db, 'users', appUser.id, 'followers')),
          getDocs(collection(db, 'users', appUser.id, 'following')),
        ]);
        setFollowersCount(followersSnap.size);
        setFollowingCount(followingSnap.size);
      } catch (e) { console.error('Error loading profile data:', e); }
    };
    if (appUser.id) load();
  }, [appUser.id]);

  const handleBecomeTipster = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    navigate('/become-tipster');
  };

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select a valid image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be less than 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setEditForm(prev => ({ ...prev, profilePicture: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePicture = () => setEditForm(prev => ({ ...prev, profilePicture: undefined }));

  const handleSaveProfile = () => {
    setEditMode(false);
    setBio(editForm.bio);
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-[#1f1f1f] px-4 py-3.5 flex items-center justify-between">
        <div className="w-10 shrink-0" />
        <h1 className="text-base font-black text-white text-center flex-1">Profile</h1>
        <button onClick={() => navigate('/settings')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors shrink-0" title="Settings">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-black border-b border-[#1f1f1f] px-4 py-8 flex flex-col items-center">
        <div className="ring-4 ring-black rounded-full overflow-hidden bg-black mb-4 shadow-xl shrink-0">
          <Avatar name={appUser.name || 'U'} size="xl" image={appUser.profilePicture} />
        </div>
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-lg font-black text-white">{appUser.name}</h2>
            {appUser.verified && <div className="w-4 h-4 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0"><Zap className="w-2.5 h-2.5 text-white" /></div>}
            {isTipster && <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded-full font-bold">TIPSTER</span>}
          </div>
          <p className="text-sm text-[#71767b] mt-0.5">{appUser.handle}</p>
          {bio && <p className="text-sm text-[#e7e9ea] mt-2 max-w-xs leading-relaxed">{bio}</p>}
        </div>
        <div className="flex items-center gap-5 mb-4">
          <div className="text-center"><p className="font-black text-white text-base">{followingCount.toLocaleString()}</p><p className="text-xs text-[#71767b]">Following</p></div>
          <div className="text-center"><p className="font-black text-white text-base">{followersCount.toLocaleString()}</p><p className="text-xs text-[#71767b]">Followers</p></div>
        </div>
        <button onClick={() => setEditMode(true)} className="px-6 py-2 border border-[#1f1f1f] rounded-full text-xs font-bold text-white hover:bg-white/5 transition-colors">Edit Profile</button>
      </div>

      <div className="sticky top-[57px] z-20 bg-black/95 backdrop-blur-md border-b border-[#1f1f1f] flex items-center overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn('flex-1 py-3 text-xs font-bold transition-all relative whitespace-nowrap px-4', activeTab === tab ? 'text-white' : 'text-[#71767b]')}>
            {tab}
            {activeTab === tab && <motion.div layoutId="profile-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ef4444] rounded-full" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {activeTab === 'Overview' && <OverviewTab userId={appUser.id} isTipster={isTipster} onBecomeTipster={handleBecomeTipster} />}
          {activeTab === 'Posts' && <PostsTab appUser={appUser} />}
          {activeTab === 'Following' && <PeopleTab userId={appUser.id} type="following" />}
          {activeTab === 'Followers' && <PeopleTab userId={appUser.id} type="followers" />}
          {activeTab === 'Subscriptions' && <SubscriptionsTab userId={appUser.id} />}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {editMode && (
          <EditProfileModal appUser={appUser} previewImage={editForm.profilePicture} editForm={editForm} setEditForm={setEditForm}
            onClose={() => setEditMode(false)} onSave={handleSaveProfile} onPictureChange={handlePictureChange} onRemovePicture={handleRemovePicture} />
        )}
      </AnimatePresence>
    </div>
  );
}
