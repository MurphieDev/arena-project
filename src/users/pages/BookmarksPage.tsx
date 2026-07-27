import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Heart, MessageCircle, Repeat2, Share, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import {
  collection, getDocs, doc, getDoc,
  query as firestoreQuery, orderBy,
  setDoc, deleteDoc, updateDoc, increment, serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../auth/hooks/AuthContext';

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

function timeAgo(ts: any): string {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  if (isNaN(date.getTime())) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function BookmarksPage() {
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const bookmarksSnap = await getDocs(
          firestoreQuery(collection(db, 'users', userId, 'bookmarks'), orderBy('createdAt', 'desc'))
        );
        const bookmarkedPosts: Post[] = [];
        const likedMap: Record<string, boolean> = {};
        for (const b of bookmarksSnap.docs) {
          const postDoc = await getDoc(doc(db, 'posts', b.id));
          if (postDoc.exists()) {
            const post = { id: postDoc.id, ...postDoc.data() } as Post;
            bookmarkedPosts.push(post);
            const likeDoc = await getDoc(doc(db, 'posts', post.id, 'likes', userId));
            likedMap[post.id] = likeDoc.exists();
          }
        }
        setPosts(bookmarkedPosts);
        setLiked(likedMap);
      } catch (e) {
        console.error('Error loading bookmarks:', e);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleLike = async (postId: string, currentLikes: number) => {
    if (!userId) return;
    const newLiked = !liked[postId];
    setLiked(l => ({ ...l, [postId]: newLiked }));
    setPosts(p => p.map(post => post.id === postId ? { ...post, likes: currentLikes + (newLiked ? 1 : -1) } : post));
    const likeRef = doc(db, 'posts', postId, 'likes', userId);
    if (newLiked) {
      await setDoc(likeRef, { userId, createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'posts', postId), { likes: increment(1) });
    } else {
      await deleteDoc(likeRef);
      await updateDoc(doc(db, 'posts', postId), { likes: increment(-1) });
    }
  };

  const handleRemoveBookmark = async (postId: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'users', userId, 'bookmarks', postId));
    setPosts(p => p.filter(post => post.id !== postId));
  };

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f] px-4 py-3">
        <h1 className="text-lg font-black text-white">Bookmarks</h1>
        <p className="text-xs text-[#71767b] mt-0.5">{posts.length} saved posts</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#ef4444] animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <Bookmark className="w-12 h-12 text-[#71767b] mb-3" />
          <p className="font-bold text-white mb-1">No bookmarks yet</p>
          <p className="text-sm text-[#71767b]">Posts you save will appear here</p>
        </div>
      ) : (
        <AnimatePresence>
          {posts.map((post, i) => (
            <motion.div key={post.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#ef4444] flex items-center justify-center text-white font-black text-xs shrink-0">
                  {post.userName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm text-white">{post.userName}</p>
                    {post.tipster && <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded-full font-bold">TIPSTER</span>}
                  </div>
                  <p className="text-xs text-[#71767b]">{post.userHandle} · {timeAgo(post.createdAt)}</p>
                </div>
                <button onClick={() => handleRemoveBookmark(post.id)}
                  className="p-1.5 rounded-full hover:bg-white/10">
                  <Bookmark className="w-4 h-4 text-[#ef4444] fill-[#ef4444]" />
                </button>
              </div>
              {post.tag && (
                <span className="inline-block text-[10px] text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded-full mb-1.5 font-semibold">{post.tag}</span>
              )}
              <p className="text-sm text-[#e7e9ea] leading-relaxed mb-3">{post.content}</p>
              {post.image && (
                <img src={post.image} alt="" className="w-full max-h-64 object-cover rounded-2xl mb-3 border border-[#1f1f1f]" />
              )}
              <div className="flex items-center gap-4 text-[#71767b]">
                <button className="flex items-center gap-1.5 text-xs hover:text-[#ef4444] transition-colors">
                  <MessageCircle className="w-4 h-4" />{fmt(post.comments || 0)}
                </button>
                <button className="flex items-center gap-1.5 text-xs hover:text-green-500 transition-colors">
                  <Repeat2 className="w-4 h-4" />{fmt(post.reposts || 0)}
                </button>
                <button onClick={() => handleLike(post.id, post.likes || 0)}
                  className={cn('flex items-center gap-1.5 text-xs transition-colors', liked[post.id] ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}>
                  <Heart className={cn('w-4 h-4', liked[post.id] && 'fill-[#ef4444]')} />{fmt(post.likes || 0)}
                </button>
                <button className="flex items-center gap-1.5 text-xs hover:text-[#ef4444] transition-colors ml-auto">
                  <Share className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
