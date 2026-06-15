import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Settings, UserPlus, UserCheck,
  Zap, Heart, MessageCircle, Repeat2,
  Bookmark, Share, Edit2, Camera, Trophy,
  TrendingUp, Users
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, onSnapshot, serverTimestamp,
  query as firestoreQuery, orderBy, where,
  doc, getDoc, setDoc, deleteDoc, updateDoc,
  addDoc, getDocs, increment
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── Types ──────────────────────────────────────────────────────────────────
interface UserProfile {
  uid: string;
  displayName: string;
  bio?: string;
  role: string;
  verified: boolean;
  winRate?: number;
  tipsCount?: number;
  walletBalance?: number;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

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
  isRepost?: boolean;
  repostedBy?: string;
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl', xl: 'w-20 h-20 text-2xl' };
  return (
    <div className={cn('rounded-full flex items-center justify-center font-black text-white shrink-0', sizes[size], color)}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ── Post Card ──────────────────────────────────────────────────────────────
function ProfilePostCard({ post, currentUserId }: { post: Post; currentUserId: string | null }) {
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likes);

  useEffect(() => {
    if (!currentUserId) return;
    getDoc(doc(db, 'posts', post.id, 'likes', currentUserId))
      .then(d => setLiked(d.exists()));
  }, [post.id, currentUserId]);

  const handleLike = async () => {
    if (!currentUserId) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLocalLikes(n => n + (newLiked ? 1 : -1));
    const likeRef = doc(db, 'posts', post.id, 'likes', currentUserId);
    if (newLiked) {
      await setDoc(likeRef, { userId: currentUserId, createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'posts', post.id), { likes: increment(1) });
    } else {
      await deleteDoc(likeRef);
      await updateDoc(doc(db, 'posts', post.id), { likes: increment(-1) });
    }
  };

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  const timeAgo = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate?.() || new Date(ts);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="px-4 py-3 border-b border-[#1f1f1f]">
      {post.isRepost && (
        <div className="flex items-center gap-1.5 mb-2 ml-12">
          <Repeat2 className="w-3 h-3 text-green-500" />
          <p className="text-xs text-green-500 font-semibold">Reposted</p>
        </div>
      )}
      <div className="flex gap-3">
        <Avatar name={post.userName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-bold text-sm text-white">{post.userName}</span>
            {post.verified && (
              <div className="w-4 h-4 rounded-full bg-[#ef4444] flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            <span className="text-[#71767b] text-xs">{timeAgo(post.createdAt)}</span>
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
          <div className="flex items-center gap-5 text-[#71767b]">
            <button className="flex items-center gap-1.5 text-xs hover:text-[#ef4444] transition-colors">
              <MessageCircle className="w-4 h-4" />{fmt(post.comments)}
            </button>
            <button className="flex items-center gap-1.5 text-xs hover:text-green-500 transition-colors">
              <Repeat2 className="w-4 h-4" />{fmt(post.reposts)}
            </button>
            <button onClick={handleLike}
              className={cn('flex items-center gap-1.5 text-xs transition-colors', liked ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}>
              <Heart className={cn('w-4 h-4', liked && 'fill-[#ef4444]')} />{fmt(localLikes)}
            </button>
            <button className="flex items-center gap-1.5 text-xs hover:text-[#ef4444] transition-colors ml-auto">
              <Bookmark className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-1.5 text-xs hover:text-[#ef4444] transition-colors">
              <Share className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Profile Modal ─────────────────────────────────────────────────────
function EditProfileModal({ profile, onClose, onSaved }: {
  profile: UserProfile;
  onClose: () => void;
  onSaved: (data: Partial<UserProfile>) => void;
}) {
  const [form, setForm] = useState({
    displayName: profile.displayName,
    bio: profile.bio || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
      });
      onSaved({ displayName: form.displayName.trim(), bio: form.bio.trim() });
      onClose();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end"
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-[#0d0d0d] border-t border-[#1f1f1f] rounded-t-3xl px-5 pt-4 pb-10">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-white text-base">Edit Profile</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5">
            <Edit2 className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#71767b] mb-1 block">Display Name</label>
            <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-[#71767b] mb-1 block">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell people about yourself..."
              rows={3}
              className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none resize-none transition-all"
            />
          </div>
          <button onClick={handleSave} disabled={saving || !form.displayName.trim()}
            className="w-full py-3 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Profile Page ───────────────────────────────────────────────────────────
export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'likes'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [reposts, setReposts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        await loadProfile(user.uid, user.uid);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const loadProfile = async (uid: string, viewerUid: string) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return;

    const data = userDoc.data();

    // Get real counts
    const [followersSnap, followingSnap, postsSnap] = await Promise.all([
      getDocs(collection(db, 'users', uid, 'followers')),
      getDocs(collection(db, 'users', uid, 'following')),
      getDocs(firestoreQuery(collection(db, 'posts'), where('userId', '==', uid))),
    ]);

    setProfile({
      uid,
      displayName: data.displayName || 'User',
      bio: data.bio || '',
      role: data.role || 'user',
      verified: data.verified || false,
      winRate: data.winRate || 0,
      tipsCount: data.tipsCount || 0,
      walletBalance: data.walletBalance || 0,
      followersCount: followersSnap.size,
      followingCount: followingSnap.size,
      postsCount: postsSnap.size,
    });

    setIsOwnProfile(uid === viewerUid);

    // Check if viewer follows this user
    if (uid !== viewerUid) {
      const followDoc = await getDoc(doc(db, 'users', uid, 'followers', viewerUid));
      setIsFollowing(followDoc.exists());
    }
  };

  // Load posts
  useEffect(() => {
    if (!profile) return;
    const q = firestoreQuery(
      collection(db, 'posts'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snapshot => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    });
    return () => unsub();
  }, [profile?.uid]);

  // Load reposts
  useEffect(() => {
    if (!profile) return;
    const loadReposts = async () => {
      const repostSnap = await getDocs(
        firestoreQuery(
          collection(db, 'users', profile.uid, 'reposts'),
          orderBy('createdAt', 'desc')
        )
      );
      const repostedPosts: Post[] = [];
      for (const repostDoc of repostSnap.docs) {
        const postDoc = await getDoc(doc(db, 'posts', repostDoc.id));
        if (postDoc.exists()) {
          repostedPosts.push({
            id: postDoc.id,
            ...postDoc.data(),
            isRepost: true,
          } as Post);
        }
      }
      setReposts(repostedPosts);
    };
    loadReposts();
  }, [profile?.uid]);

  // Load liked posts
  useEffect(() => {
    if (!profile) return;
    const loadLiked = async () => {
      const likesSnap = await getDocs(
        firestoreQuery(
          collection(db, 'users', profile.uid, 'likes'),
          orderBy('createdAt', 'desc')
        )
      );
      const liked: Post[] = [];
      for (const likeDoc of likesSnap.docs) {
        const postDoc = await getDoc(doc(db, 'posts', likeDoc.id));
        if (postDoc.exists()) {
          liked.push({ id: postDoc.id, ...postDoc.data() } as Post);
        }
      }
      setLikedPosts(liked);
    };
    if (activeTab === 'likes') loadLiked();
  }, [profile?.uid, activeTab]);

  const handleFollow = async () => {
    if (!currentUserId || !profile || isOwnProfile) return;
    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);

    // Update follower count optimistically
    setProfile(prev => prev ? {
      ...prev,
      followersCount: prev.followersCount + (newFollowing ? 1 : -1)
    } : null);

    const followerRef = doc(db, 'users', profile.uid, 'followers', currentUserId);
    const followingRef = doc(db, 'users', currentUserId, 'following', profile.uid);

    if (newFollowing) {
      await setDoc(followerRef, { userId: currentUserId, createdAt: serverTimestamp() });
      await setDoc(followingRef, { userId: profile.uid, createdAt: serverTimestamp() });
      // Update counts in Firestore
      await updateDoc(doc(db, 'users', profile.uid), { followersCount: increment(1) });
      await updateDoc(doc(db, 'users', currentUserId), { followingCount: increment(1) });
      // Notify
      const viewerDoc = await getDoc(doc(db, 'users', currentUserId));
      await addDoc(collection(db, 'notifications'), {
        userId: profile.uid,
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
      await updateDoc(doc(db, 'users', profile.uid), { followersCount: increment(-1) });
      await updateDoc(doc(db, 'users', currentUserId), { followingCount: increment(-1) });
    }
  };

  const currentTabPosts = activeTab === 'posts' ? posts : activeTab === 'reposts' ? reposts : likedPosts;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-8">
        <p className="text-3xl mb-3">👤</p>
        <p className="font-bold text-white mb-1">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur border-b border-[#1f1f1f] px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()} className="p-1.5 rounded-full hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <p className="font-black text-white text-sm">{profile.displayName}</p>
          <p className="text-xs text-[#71767b]">{profile.postsCount} posts</p>
        </div>
        {isOwnProfile && (
          <button onClick={() => {/* go to settings */}} className="p-1.5 rounded-full hover:bg-white/10">
            <Settings className="w-5 h-5 text-[#71767b]" />
          </button>
        )}
      </div>

      {/* Cover / Avatar */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-br from-[#ef4444]/30 via-[#1f1f1f] to-black" />
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-8 mb-3">
            <div className="relative">
              <Avatar name={profile.displayName} size="xl" />
              {profile.verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#ef4444] rounded-full flex items-center justify-center ring-2 ring-black">
                  <Zap className="w-3.5 h-3.5 text-white fill-white" />
                </div>
              )}
              {isOwnProfile && (
                <button className="absolute bottom-0 right-0 w-6 h-6 bg-[#1f1f1f] border border-[#2f2f2f] rounded-full flex items-center justify-center">
                  <Camera className="w-3 h-3 text-white" />
                </button>
              )}
            </div>

            {isOwnProfile ? (
              <button onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 border border-[#1f1f1f] rounded-full text-xs font-bold text-white hover:bg-white/5 transition-colors">
                <Edit2 className="w-3.5 h-3.5" /> Edit Profile
              </button>
            ) : (
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

          {/* Name + bio */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-lg font-black text-white">{profile.displayName}</h1>
              {profile.role === 'tipster' && (
                <span className="text-[10px] bg-[#ef4444]/20 text-[#ef4444] px-2 py-0.5 rounded-full font-black">TIPSTER</span>
              )}
            </div>
            <p className="text-sm text-[#71767b]">@{profile.displayName.toLowerCase().replace(/\s/g, '')}</p>
            {profile.bio && <p className="text-sm text-[#e7e9ea] mt-2 leading-relaxed">{profile.bio}</p>}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 mb-4">
            <button className="text-center">
              <p className="font-black text-white text-base">{profile.postsCount}</p>
              <p className="text-xs text-[#71767b]">Posts</p>
            </button>
            <button className="text-center">
              <p className="font-black text-white text-base">{profile.followersCount.toLocaleString()}</p>
              <p className="text-xs text-[#71767b]">Followers</p>
            </button>
            <button className="text-center">
              <p className="font-black text-white text-base">{profile.followingCount.toLocaleString()}</p>
              <p className="text-xs text-[#71767b]">Following</p>
            </button>
          </div>

          {/* Tipster stats */}
          {profile.role === 'tipster' && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-3 text-center">
                <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
                <p className="text-sm font-black text-white">{profile.winRate}%</p>
                <p className="text-[10px] text-[#71767b]">Win Rate</p>
              </div>
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-3 text-center">
                <Trophy className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <p className="text-sm font-black text-white">{profile.tipsCount}</p>
                <p className="text-[10px] text-[#71767b]">Tips</p>
              </div>
              {isOwnProfile && (
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-3 text-center">
                  <Users className="w-4 h-4 text-[#ef4444] mx-auto mb-1" />
                  <p className="text-sm font-black text-white">₦{(profile.walletBalance || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-[#71767b]">Wallet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content tabs */}
      <div className="flex items-center border-b border-[#1f1f1f] px-4">
        {[
          { key: 'posts', label: 'Posts' },
          { key: 'reposts', label: 'Reposts' },
          { key: 'likes', label: 'Likes' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={cn('flex-1 py-3 text-xs font-bold transition-all relative',
              activeTab === tab.key ? 'text-white' : 'text-[#71767b]'
            )}>
            {tab.label}
            {activeTab === tab.key && (
              <motion.div layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ef4444] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Posts */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {currentTabPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-3xl mb-3">
                {activeTab === 'posts' ? '📝' : activeTab === 'reposts' ? '🔁' : '❤️'}
              </p>
              <p className="font-bold text-sm text-white">
                {activeTab === 'posts' ? 'No posts yet' : activeTab === 'reposts' ? 'No reposts yet' : 'No liked posts yet'}
              </p>
            </div>
          ) : currentTabPosts.map(post => (
            <ProfilePostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Edit modal */}
      <AnimatePresence>
        {showEdit && (
          <EditProfileModal
            profile={profile}
            onClose={() => setShowEdit(false)}
            onSaved={(data) => setProfile(prev => prev ? { ...prev, ...data } : null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
