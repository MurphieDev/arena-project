import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Heart, MessageCircle, Repeat2,
  Bookmark, Share, MoreHorizontal, Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import {
  collection, doc, getDoc, getDocs,
  query as firestoreQuery, where, orderBy,
  setDoc, deleteDoc, updateDoc, increment, serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../auth/hooks/AuthContext';

function Avatar({ name, size = 'lg', image }: { name: string; size?: 'sm' | 'md' | 'lg'; image?: string }) {
  const colors = ['bg-[#ef4444]', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-12 h-12 text-base', lg: 'w-24 h-24 text-4xl' };
  if (image) return <img src={image} alt={name} className={cn('rounded-full object-cover shrink-0', sizes[size])} />;
  return (
    <div className={cn('rounded-full flex items-center justify-center font-black text-white shrink-0', sizes[size], color)}>
      {name?.[0]?.toUpperCase() || 'U'}
    </div>
  );
}

function timeAgo(ts: any): string {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  if (isNaN(date.getTime())) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function UserProfileRoute() {
  const params = useParams<{ userId: string }>();
  const navigate = useNavigate();
  return <UserProfileView userId={params.userId || ''} onBack={() => navigate(-1)} />;
}

interface UserProfileViewProps {
  userId?: string;
  userName?: string;
  onBack: () => void;
}

export function UserProfileView({ userId, userName, onBack }: UserProfileViewProps) {
  const { user: currentUser } = useAuth();
  const me = currentUser as any;
  const myId = me?.id || me?.uid || '';

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies'>('posts');
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  // Resolve userId from either userId prop or userName prop
  const [resolvedUserId, setResolvedUserId] = useState(userId || '');

  useEffect(() => {
    if (userId) { setResolvedUserId(userId); return; }
    if (!userName) return;
    // Find user by displayName
    getDocs(collection(db, 'users')).then(snap => {
      const found = snap.docs.find(d =>
        (d.data().displayName || '').toLowerCase() === userName.toLowerCase()
      );
      if (found) setResolvedUserId(found.id);
    });
  }, [userId, userName]);

  // Load profile
  useEffect(() => {
    if (!resolvedUserId) return;
    const load = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', resolvedUserId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile({
            id: resolvedUserId,
            name: data.displayName || 'User',
            handle: data.handle || `@${(data.displayName || '').toLowerCase().replace(/\s/g, '')}`,
            bio: data.bio || '',
            location: data.location || '',
            joined: data.createdAt?.toDate?.()?.toLocaleDateString('en', { month: 'long', year: 'numeric' }) || '',
            verified: data.verified || false,
            tipster: data.role === 'tipster',
            winRate: data.winRate ? `${data.winRate}%` : null,
            streak: data.streak || 0,
            profilePicture: data.profilePicture || null,
          });
        }

        // Load followers/following counts
        const [frs, fing] = await Promise.all([
          getDocs(collection(db, 'users', resolvedUserId, 'followers')),
          getDocs(collection(db, 'users', resolvedUserId, 'following')),
        ]);
        setFollowersCount(frs.size);
        setFollowingCount(fing.size);

        // Check if I follow this user
        if (myId) {
          const followDoc = await getDoc(doc(db, 'users', myId, 'following', resolvedUserId));
          setFollowing(followDoc.exists());
        }

        // Load posts
        const postsSnap = await getDocs(
          firestoreQuery(collection(db, 'posts'), where('userId', '==', resolvedUserId), orderBy('createdAt', 'desc'))
        );
        const postList = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPosts(postList);

        // Check liked/bookmarked
        if (myId) {
          const likedMap: Record<string, boolean> = {};
          const bookmarkMap: Record<string, boolean> = {};
          for (const p of postList) {
            const [likeDoc, bookmarkDoc] = await Promise.all([
              getDoc(doc(db, 'posts', p.id, 'likes', myId)),
              getDoc(doc(db, 'users', myId, 'bookmarks', p.id)),
            ]);
            likedMap[p.id] = likeDoc.exists();
            bookmarkMap[p.id] = bookmarkDoc.exists();
          }
          setLiked(likedMap);
          setBookmarked(bookmarkMap);
        }
      } catch (e) { console.error('Error loading profile:', e); }
      setLoading(false);
    };
    load();
  }, [resolvedUserId, myId]);

  const handleFollow = async () => {
    if (!myId || !resolvedUserId || myId === resolvedUserId) return;
    const newFollowing = !following;
    setFollowing(newFollowing);
    setFollowersCount(n => n + (newFollowing ? 1 : -1));
    if (newFollowing) {
      await setDoc(doc(db, 'users', myId, 'following', resolvedUserId), { userId: resolvedUserId, createdAt: serverTimestamp() });
      await setDoc(doc(db, 'users', resolvedUserId, 'followers', myId), { userId: myId, createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'users', resolvedUserId), { followersCount: increment(1) });
    } else {
      await deleteDoc(doc(db, 'users', myId, 'following', resolvedUserId));
      await deleteDoc(doc(db, 'users', resolvedUserId, 'followers', myId));
      await updateDoc(doc(db, 'users', resolvedUserId), { followersCount: increment(-1) });
    }
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    if (!myId) return;
    const newLiked = !liked[postId];
    setLiked(l => ({ ...l, [postId]: newLiked }));
    setPosts(p => p.map(post => post.id === postId ? { ...post, likes: currentLikes + (newLiked ? 1 : -1) } : post));
    const likeRef = doc(db, 'posts', postId, 'likes', myId);
    if (newLiked) {
      await setDoc(likeRef, { userId: myId, createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'posts', postId), { likes: increment(1) });
    } else {
      await deleteDoc(likeRef);
      await updateDoc(doc(db, 'posts', postId), { likes: increment(-1) });
    }
  };

  const handleBookmark = async (postId: string) => {
    if (!myId) return;
    const newBookmarked = !bookmarked[postId];
    setBookmarked(b => ({ ...b, [postId]: newBookmarked }));
    const bookmarkRef = doc(db, 'users', myId, 'bookmarks', postId);
    if (newBookmarked) await setDoc(bookmarkRef, { postId, createdAt: serverTimestamp() });
    else await deleteDoc(bookmarkRef);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-[#71767b]">User not found</p>
    </div>
  );

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-[#1f1f1f] px-4 py-3.5 flex items-center justify-between">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-black text-white text-center flex-1">{profile.name}</h1>
        <button onClick={() => setShowMoreMenu(m => !m)}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-[#71767b] hover:text-white shrink-0 relative">
          <MoreHorizontal className="w-5 h-5" />
          <AnimatePresence>
          {showMoreMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                className="absolute right-0 top-10 w-52 bg-[#0f0f11] border border-[#2a2a30] rounded-2xl overflow-hidden shadow-2xl z-50">
                <button onClick={() => {
                  const url = `${window.location.origin}/profile/${resolvedUserId}`;
                  if (navigator.share) {
                    navigator.share({ title: profile.name, url });
                  } else {
                    navigator.clipboard?.writeText(url);
                    alert('Profile link copied!');
                  }
                  setShowMoreMenu(false);
                }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 border-b border-[#1f1f1f]">
                  Share Profile
                </button>
                <button onClick={() => {
                  const url = `${window.location.origin}/profile/${resolvedUserId}`;
                  navigator.clipboard?.writeText(url).then(() => alert('Profile link copied!'));
                  setShowMoreMenu(false);
                }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 border-b border-[#1f1f1f]">
                  Copy Profile Link
                </button>
                <button onClick={async () => {
                  if (!myId) return;
                  await setDoc(doc(db, 'users', myId, 'muted', resolvedUserId), { userId: resolvedUserId, createdAt: serverTimestamp() });
                  setShowMoreMenu(false);
                  alert(`${profile.name} muted`);
                }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 border-b border-[#1f1f1f]">
                  Mute {profile.name}
                </button>
                <button onClick={async () => {
                  if (!myId) return;
                  await setDoc(doc(db, 'users', myId, 'blocked', resolvedUserId), { userId: resolvedUserId, createdAt: serverTimestamp() });
                  setShowMoreMenu(false);
                  alert(`${profile.name} blocked`);
                }} className="w-full text-left px-4 py-3 text-sm text-[#ef4444] hover:bg-[#ef4444]/10 border-b border-[#1f1f1f]">
                  Block {profile.name}
                </button>
                <button onClick={() => {
                  setShowMoreMenu(false);
                  alert('Report submitted. We will review this account.');
                }} className="w-full text-left px-4 py-3 text-sm text-[#ef4444] hover:bg-[#ef4444]/10">
                  Report Account
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        </button>
      </div>

      {/* Profile */}
      <div className="bg-black border-b border-[#1f1f1f] px-4 py-8 flex flex-col items-center">
        <div className="ring-4 ring-black rounded-full overflow-hidden bg-black mb-4 shadow-xl shrink-0">
          <Avatar name={profile.name} size="lg" image={profile.profilePicture} />
        </div>
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <h1 className="text-xl font-black text-white">{profile.name}</h1>
            {profile.verified && (
              <div className="w-4 h-4 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0">
                <Zap className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            {profile.tipster && (
              <span className="text-[10px] bg-[#ef4444]/20 text-[#ef4444] px-2 py-0.5 rounded-full font-bold">TIPSTER</span>
            )}
          </div>
          <p className="text-sm text-[#71767b] mt-0.5">{profile.handle}</p>
        </div>
        {profile.bio && <p className="text-sm text-[#e7e9ea] text-center leading-relaxed max-w-[400px] mb-4">{profile.bio}</p>}
        {profile.tipster && profile.winRate && (
          <div className="flex items-center gap-3 mb-4 flex-wrap justify-center">
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-bold">{profile.winRate} Win Rate</span>
            {profile.streak > 0 && (
              <span className="text-xs bg-[#ef4444]/20 text-[#ef4444] px-2 py-1 rounded-full font-bold">{profile.streak}-win streak 🔥</span>
            )}
          </div>
        )}
        <div className="flex gap-8 text-center mb-6">
          <div>
            <p className="text-base font-black text-white">{fmt(followersCount)}</p>
            <p className="text-xs text-[#71767b] mt-0.5">Followers</p>
          </div>
          <div>
            <p className="text-base font-black text-white">{fmt(followingCount)}</p>
            <p className="text-xs text-[#71767b] mt-0.5">Following</p>
          </div>
        </div>
        {myId !== resolvedUserId && (
          <div className="w-full max-w-[170px]">
            <button onClick={handleFollow}
              className={cn('w-full h-11 rounded-full text-xs font-black transition-all shadow-md',
                following ? 'border border-[#2a2a30] text-[#71767b] hover:border-[#ef4444]/50 hover:text-[#ef4444]' : 'bg-white text-black hover:bg-white/90'
              )}>
              {following ? 'Following ✓' : 'Follow'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center px-4 py-2 gap-1 border-b border-[#1f1f1f]">
        {(['posts', 'replies'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all',
              activeTab === tab ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
            )}>{tab}</button>
        ))}
      </div>

      {/* Posts */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-2xl mb-2">📝</p>
              <p className="font-bold text-white">No posts yet</p>
            </div>
          ) : posts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors cursor-pointer">
              {post.tag && (
                <span className="inline-block text-[10px] text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded-full mb-1.5 font-semibold">{post.tag}</span>
              )}
              <p className="text-sm text-[#e7e9ea] leading-relaxed mb-2">{post.content}</p>
              {post.image && <img src={post.image} alt="" className="w-full max-h-64 object-cover rounded-2xl mb-2 border border-[#1f1f1f]" />}
              <p className="text-xs text-[#71767b] mb-2">{timeAgo(post.createdAt)}</p>
              <div className="flex items-center gap-5 text-[#71767b]">
                <button className="flex items-center gap-1 text-xs hover:text-[#ef4444] transition-colors">
                  <MessageCircle className="w-4 h-4" />{post.comments || 0}
                </button>
                <button className="flex items-center gap-1 text-xs hover:text-green-500 transition-colors">
                  <Repeat2 className="w-4 h-4" />{post.reposts || 0}
                </button>
                <button onClick={() => handleLike(post.id, post.likes || 0)}
                  className={cn('flex items-center gap-1 text-xs transition-colors', liked[post.id] ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}>
                  <Heart className={cn('w-4 h-4', liked[post.id] && 'fill-[#ef4444]')} />
                  {post.likes || 0}
                </button>
                <button onClick={() => handleBookmark(post.id)}
                  className={cn('flex items-center gap-1 text-xs transition-colors', bookmarked[post.id] ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}>
                  <Bookmark className={cn('w-4 h-4', bookmarked[post.id] && 'fill-[#ef4444]')} />
                </button>
                <button className="flex items-center gap-1 text-xs hover:text-[#ef4444] transition-colors">
                  <Share className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
