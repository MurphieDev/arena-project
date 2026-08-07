import { useState, useEffect, useRef, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Heart, MessageCircle, Repeat2,
  Bookmark, Share, MoreHorizontal, Zap,
  Image, Smile, X, Plus, Video, BarChart2,
  MapPin, Play, Flag, VolumeX, UserMinus, EyeOff
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { db, auth } from '../../lib/firebase';
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query as firestoreQuery, orderBy, limit,
  doc, setDoc, deleteDoc, updateDoc, increment, getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '../../auth/hooks/AuthContext';
import { MatchDetailPage } from './Matchdetailpage';
import { PostThreadPage } from './PostThreadPage';
import { UserProfileView } from './UserProfileView';
import { ShareSheet, MoreMenu, PollCreator } from '../../components/SharedComponents';
import { FeedProvider } from '../../stores/feedStore';
import { FeedContainer } from '../../components/feed/FeedContainer';

// ── Types ─────────────────────────────────────────────────────
interface Post {
  id: string;
  user: { name: string; handle: string; verified: boolean; tipster: boolean };
  content: string;
  time: string;
  likes: number;
  comments: number;
  reposts: number;
  tag?: string;
  image?: string;
  video?: string;
  poll?: { question: string; options: string[]; duration: string };
}



// ── Avatar ────────────────────────────────────────────────────
function Avatar({ name, size = 'md', onClick }: { name: string; size?: 'sm' | 'md' | 'lg'; onClick?: (e: MouseEvent<HTMLDivElement>) => void }) {
  const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  return (
    <div onClick={onClick} className={cn('rounded-full flex items-center justify-center font-black text-white shrink-0', sizes[size], color, onClick && 'cursor-pointer')}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ── Poll Display ──────────────────────────────────────────────
function PollDisplay({ poll }: { poll: NonNullable<Post['poll']> }) {
  const [voted, setVoted] = useState<number | null>(null);
  const votes = [234, 156, 89, 45];
  const total = votes.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-3 mb-3">
      <p className="font-bold text-sm text-white mb-2">{poll.question}</p>
      <div className="space-y-2">
        {poll.options.map((opt, i) => {
          const pct = Math.round((votes[i] / total) * 100);
          const isVoted = voted === i;
          return (
            <button
              key={i}
              onClick={() => setVoted(i)}
              disabled={voted !== null}
              className="w-full relative overflow-hidden rounded-xl border transition-all text-left"
              style={{ borderColor: isVoted ? '#ef4444' : '#1f1f1f' }}
            >
              {voted !== null && (
                <div
                  className="absolute inset-y-0 left-0 bg-[#ef4444]/20 transition-all"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className={cn('text-sm font-semibold', isVoted ? 'text-[#ef4444]' : 'text-white')}>{opt}</span>
                {voted !== null && <span className="text-xs text-[#71767b] font-bold">{pct}%</span>}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-[#71767b] mt-2">{total} votes · {poll.duration}</p>
    </div>
  );
}

// ── Post Modal ────────────────────────────────────────────────
function PostModal({ onClose, onPost, onOpenPoll }: {
  onClose: () => void;
  onPost: (text: string, image?: string, video?: string) => void;
  onOpenPoll: () => void;
}) {
  const [text, setText] = useState('');
  const [activeType, setActiveType] = useState<'post' | 'prediction'>('post');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoName, setVideoName] = useState('');
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

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(null);
    setVideoName(file.name);
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setVideoPreview(localUrl);
    // Upload to Cloudinary for permanent URL
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'arena_videos');
      const res = await fetch('https://api.cloudinary.com/v1_1/dqkjsrjeh/video/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        setVideoPreview(data.secure_url);
      }
    } catch (e) {
      console.error('Video upload failed:', e);
    }
  };

  const clearMedia = () => { setImagePreview(null); setVideoPreview(null); setVideoName(''); };
  const canPost = text.trim() || imagePreview || videoPreview;

  const tools = [
    { icon: Image, label: 'Photo', action: () => imageInputRef.current?.click() },
    { icon: Video, label: 'Video', action: () => videoInputRef.current?.click() },
    { icon: BarChart2, label: 'Poll', action: () => { onClose(); onOpenPoll(); } },
    { icon: Smile, label: 'Emoji', action: () => {} },
    { icon: MapPin, label: 'Location', action: () => {} },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                className={cn('px-3 py-1 rounded-full text-xs font-bold capitalize transition-all', activeType === t ? 'bg-[#ef4444] text-white' : 'text-[#71767b]')}
              >{t}</button>
            ))}
          </div>
          <button
            onClick={() => { if (canPost) { onPost(text, imagePreview ?? undefined, videoPreview ?? undefined); onClose(); } }}
            disabled={!canPost}
            className="px-4 py-1.5 bg-[#ef4444] rounded-full text-sm font-bold text-white disabled:opacity-40 hover:bg-[#dc2626] transition-colors"
          >Post</button>
        </div>

        <div className="flex gap-3 px-4 py-4">
          <Avatar name="Me" size="md" />
          <div className="flex-1">
            <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)}
              placeholder={activeType === 'post' ? "What's happening in sports?" : "Share your prediction..."}
              rows={4} className="w-full bg-transparent text-white placeholder:text-[#71767b] text-base outline-none resize-none leading-relaxed"
            />
            <AnimatePresence>
              {imagePreview && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="relative mt-2 rounded-2xl overflow-hidden border border-[#1f1f1f]"
                >
                  <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover rounded-2xl" />
                  <button onClick={clearMedia} className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </motion.div>
              )}
              {videoPreview && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="relative mt-2 rounded-2xl overflow-hidden border border-[#1f1f1f] bg-[#111]"
                >
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
              {activeType === 'prediction' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-2">
                  <input placeholder="Match (e.g. Man City vs Arsenal)" className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none transition-all" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Your prediction" className="bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none transition-all" />
                    <input placeholder="Odds (optional)" className="bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none transition-all" />
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
            {tools.map(tool => { const Icon = tool.icon; return (
              <button key={tool.label} onClick={tool.action} className="p-2 rounded-full hover:bg-[#ef4444]/10 transition-colors" title={tool.label}>
                <Icon className="w-4 h-4" />
              </button>
            ); })}
          </div>
          {text && <span className={cn('text-xs font-semibold', text.length > 260 ? 'text-[#ef4444]' : 'text-[#71767b]')}>{280 - text.length}</span>}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Post Card ─────────────────────────────────────────────────
function PostCard({ post, onPostClick, onUserClick, onShare, currentUserId }: {
  post: Post;
  onPostClick: (post: Post) => void;
  onUserClick: (name: string) => void;
  onShare: (post: Post) => void;
  onMore?: (post: Post) => void;
  currentUserId?: string | null;
}) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likes || 0);
  const [localReposts, setLocalReposts] = useState(post.reposts || 0);
  const [showDropdown, setShowDropdown] = useState(false);
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  // Check if already liked/reposted/bookmarked
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

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLocalLikes(n => n + (newLiked ? 1 : -1));
    try {
      const likeRef = doc(db, 'posts', post.id, 'likes', currentUserId);
      if (newLiked) {
        await setDoc(likeRef, { userId: currentUserId, createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'posts', post.id), { likes: increment(1) });
      } else {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'posts', post.id), { likes: increment(-1) });
      }
    } catch { setLiked(!newLiked); setLocalLikes(n => n + (newLiked ? -1 : 1)); }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    const newReposted = !reposted;
    setReposted(newReposted);
    setLocalReposts(n => n + (newReposted ? 1 : -1));
    try {
      const repostRef = doc(db, 'posts', post.id, 'reposts', currentUserId);
      if (newReposted) {
        await setDoc(repostRef, { userId: currentUserId, createdAt: serverTimestamp() });
        await setDoc(doc(db, 'users', currentUserId, 'reposts', post.id), { postId: post.id, createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'posts', post.id), { reposts: increment(1) });
      } else {
        await deleteDoc(repostRef);
        await deleteDoc(doc(db, 'users', currentUserId, 'reposts', post.id));
        await updateDoc(doc(db, 'posts', post.id), { reposts: increment(-1) });
      }
    } catch { setReposted(!newReposted); setLocalReposts(n => n + (newReposted ? -1 : 1)); }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    try {
      const bookmarkRef = doc(db, 'users', currentUserId, 'bookmarks', post.id);
      if (newBookmarked) await setDoc(bookmarkRef, { postId: post.id, createdAt: serverTimestamp() });
      else await deleteDoc(bookmarkRef);
    } catch { setBookmarked(!newBookmarked); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors cursor-pointer"
      onClick={() => onPostClick(post)}
    >
      <div className="flex gap-3">
        <Avatar name={post.user.name} size="md" onClick={(e: any) => { e.stopPropagation(); onUserClick(post.user.name); }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <button onClick={e => { e.stopPropagation(); onUserClick(post.user.name); }}
                className="font-bold text-sm text-white hover:underline truncate"
              >{post.user.name}</button>
              {post.user.verified && (
                <div className="w-4 h-4 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0">
                  <Zap className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              {post.user.tipster && (
                <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded-full font-bold shrink-0">TIPSTER</span>
              )}
              <span className="text-[#71767b] text-xs">{post.user.handle} · {post.time}</span>
            </div>
            
            {/* Pop-up Action Menu Bubble */}
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
                className="p-1 rounded-full hover:bg-white/5 text-[#71767b] shrink-0"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={e => { e.stopPropagation(); setShowDropdown(false); }} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-7 w-44 bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl shadow-2xl py-1 z-40 overflow-hidden"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setShowDropdown(false);
                          alert(`Reported post from ${post.user.name}`);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/5 transition-colors text-left font-semibold"
                      >
                        <Flag className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
                        <span>Report Post</span>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setShowDropdown(false);
                          alert(`Muted ${post.user.handle}`);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/5 transition-colors text-left font-semibold"
                      >
                        <VolumeX className="w-3.5 h-3.5 text-[#71767b] shrink-0" />
                        <span>Mute {post.user.handle}</span>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setShowDropdown(false);
                          alert(`Unfollowed ${post.user.handle}`);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/5 transition-colors text-left font-semibold"
                      >
                        <UserMinus className="w-3.5 h-3.5 text-[#71767b] shrink-0" />
                        <span>Unfollow {post.user.handle}</span>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setShowDropdown(false);
                          alert("Marked as not interested");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/5 transition-colors text-left font-semibold"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-[#71767b] shrink-0" />
                        <span>Not interested</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {post.tag && (
            <span className="inline-block text-[10px] text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded-full mb-1.5 font-semibold">
              {post.tag}
            </span>
          )}

          <p className="text-sm text-[#e7e9ea] leading-relaxed mb-2">{post.content}</p>

          {post.image && (
            <div className="mb-3 rounded-2xl overflow-hidden border border-[#1f1f1f]">
              <img src={post.image} alt="Post" className="w-full max-h-80 object-cover" />
            </div>
          )}

          {post.video && (
            <div className="mb-3 rounded-2xl overflow-hidden border border-[#1f1f1f]" onClick={e => e.stopPropagation()}>
              <video src={post.video} controls className="w-full h-auto rounded-2xl" />
            </div>
          )}

          {post.poll && <PollDisplay poll={post.poll} />}

          {/* Twitter-style interaction alignment, constrained with max-width to remove excess space */}
          <div className="flex items-center justify-between text-[#71767b] max-w-sm w-full mt-2 select-none" onClick={e => e.stopPropagation()}>
            <button onClick={() => onPostClick(post)} className="flex items-center gap-1 hover:text-[#ef4444] transition-colors group">
              <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-xs">{fmt(post.comments)}</span>
            </button>
            <button onClick={handleRepost}
              className={cn('flex items-center gap-1 transition-colors group', reposted ? 'text-green-500' : 'hover:text-green-500')}
            >
              <div className="p-1.5 rounded-full group-hover:bg-green-500/10 transition-colors">
                <Repeat2 className="w-4 h-4" />
              </div>
              <span className="text-xs">{fmt(localReposts)}</span>
            </button>
            <button onClick={handleLike}
              className={cn('flex items-center gap-1 transition-colors group', liked ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}
            >
              <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10 transition-colors">
                <Heart className={cn('w-4 h-4', liked && 'fill-[#ef4444]')} />
              </div>
              <span className="text-xs">{fmt(localLikes)}</span>
            </button>
            <button onClick={handleBookmark}
              className={cn('flex items-center gap-1 transition-colors group', bookmarked ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}
            >
              <div className="p-1.5 rounded-full group-hover:bg-[#ef4444]/10 transition-colors">
                <Bookmark className={cn('w-4 h-4', bookmarked && 'fill-[#ef4444]')} />
              </div>
            </button>
            <button
              onClick={() => onShare(post)}
              className="flex items-center gap-1 hover:text-[#ef4444] transition-colors group"
            >
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

// ── Time ago helper ─────────────────────────────────────────
function timeAgo(timestamp: any): string {
  if (!timestamp) return 'Just now';
  const date = timestamp?.toDate ? timestamp.toDate() : timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  if (isNaN(date.getTime())) return 'Just now';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Home Page ─────────────────────────────────────────────────
export function HomePage() {
  const { user } = useAuth();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trending' | 'new' | 'following' | 'video'>('trending');
  const [showModal, setShowModal] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [morePost, setMorePost] = useState<Post | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [compactSearchActive, setCompactSearchActive] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 100) setShowButton(false);
      else setShowButton(true);
      setIsScrolled(currentY > 50);
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get current user ID
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setCurrentUserId(fbUser?.uid || null);
    });
    return () => unsub();
  }, []);

  // Load real posts from Firestore
  useEffect(() => {
    const q = activeTab === 'new'
      ? firestoreQuery(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30))
      : firestoreQuery(collection(db, 'posts'), orderBy('likes', 'desc'), limit(30));
    const unsub = onSnapshot(q, snapshot => {
      const firestorePosts = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          user: {
            name: data.userName || 'User',
            handle: data.userHandle || '@user',
            verified: data.verified || false,
            tipster: data.tipster || false,
          },
          content: data.content || '',
          time: data.createdAt?.toDate
            ? timeAgo(data.createdAt)
            : 'Just now',
          likes: data.likes || 0,
          comments: data.comments || 0,
          reposts: data.reposts || 0,
          tag: data.tag,
          image: data.image,
          video: data.video,
        } as Post;
      });
      setPosts(firestorePosts);
    });
    return () => unsub();
  }, [activeTab]);

  // Listen for mobile create button click
  useEffect(() => {
    const handleOpenPostModal = () => setShowModal(true);
    window.addEventListener('openPostModal', handleOpenPostModal);
    return () => window.removeEventListener('openPostModal', handleOpenPostModal);
  }, []);

  const handleNewPost = async (text: string, image?: string, video?: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'posts'), {
        userId: (user as any).id || (user as any).uid || '',
        userName: (user as any).name || (user as any).displayName || '',
        userHandle: (user as any).handle || `@${((user as any).name || '').toLowerCase().replace(/\s/g, '')}`,
        verified: (user as any).verified || false,
        tipster: (user as any).role === 'tipster',
        content: text,
        image: image || null,
        video: video || null,
        tag: 'Sports',
        likes: 0,
        comments: 0,
        reposts: 0,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Error posting:', e);
    }
  };

  const handleNewPoll = (poll: { question: string; options: string[]; duration: string }) => {
    setPosts(prev => [{
      id: `poll-${Date.now()}`,
      user: { name: 'SportX Fan', handle: '@sportxfan', verified: false, tipster: false },
      content: '',
      time: 'Just now', likes: 0, comments: 0, reposts: 0,
      poll,
    }, ...prev]);
  };

  const filteredPosts = searchQuery
    ? posts.filter(p =>
        p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tag?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  const tabs = [
    { key: 'trending', label: 'Trending' },
    { key: 'new', label: 'New' },
    { key: 'following', label: 'Following' },
    { key: 'video', label: 'Video' },
  ] as const;

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!selectedPost && !selectedMatch && !selectedUser ? (
          <motion.div
            key="home-feed"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {/* Tabs nav row — pinned under header */}
            <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
              <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {tabs.map(tab => (
                    <button key={tab.key} onClick={() => { setActiveTab(tab.key); }}
                      className={cn('px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-all relative overflow-visible whitespace-nowrap',
                        activeTab === tab.key ? 'text-white' : 'text-[#9aa0a6] hover:text-white hover:bg-white/2'
                      )}
                    >
                      <span className="relative z-20">{tab.label}</span>

                      {activeTab === tab.key && (
                        <>
                          <motion.span layoutId="active-tab-pill" transition={{ type: 'spring', stiffness: 700, damping: 40 }}
                            className="absolute inset-0 rounded-md bg-white/4 z-0"
                          />
                          <motion.span layoutId="active-tab-indicator" transition={{ type: 'spring', stiffness: 700, damping: 35 }}
                            className="absolute left-3 right-3 -bottom-1 h-0.5 bg-[#ef4444] rounded z-10"
                          />
                        </>
                      )}
                    </button>
                  ))}
                </div>

                {/* Minimized Scroll Search Icon / Compact Input */}
                <AnimatePresence>
                  {isScrolled && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-2"
                    >
                      {compactSearchActive ? (
                        <div className="flex items-center gap-1.5 bg-[#111] border border-[#1f1f1f] rounded-full px-2.5 py-1 transition-all w-32 sm:w-44">
                          <Search className="w-3.5 h-3.5 text-[#71767b] shrink-0" />
                          <input
                            autoFocus
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="bg-transparent text-[11px] text-white outline-none w-full placeholder:text-[#71767b]"
                            onBlur={() => {
                              if (!searchQuery) setCompactSearchActive(false);
                            }}
                          />
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setCompactSearchActive(false);
                            }}
                            className="text-[#71767b] hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCompactSearchActive(true)}
                          className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[#71767b] hover:text-white transition-all mr-1"
                          title="Search Arena"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Search bar always visible when at the top */}
              <AnimatePresence>
                {!isScrolled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="px-4 py-2 border-t border-[#1f1f1f] overflow-hidden"
                  >
                    <div className="max-w-3xl mx-auto">
                      <div className="flex items-center gap-2 bg-[#111] rounded-full px-3 py-1.5 border border-[#1f1f1f] focus-within:border-[#ef4444]/30 transition-all">
                        <Search className="w-3.5 h-3.5 text-[#71767b] shrink-0" />
                        <input
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search Arena..."
                          className="flex-1 bg-transparent text-xs text-white placeholder:text-[#71767b] outline-none"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search label */}
            {searchQuery && (
              <div className="px-4 py-2 border-b border-[#1f1f1f]">
                <p className="text-xs text-[#71767b]">
                  {filteredPosts.length} results for <span className="text-white font-bold">"{searchQuery}"</span>
                </p>
              </div>
            )}

            {/* Feed */}
            <AnimatePresence mode="wait">
              {activeTab === 'video' ? (
                <motion.div key="video-feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <FeedProvider>
                    <FeedContainer
                      filter="video"
                      onUserClick={(name: string) => setSelectedUser(name)}
                      onMatchClick={(matchId: string) => setSelectedMatch(matchId)}
                      onTagClick={(_tag: string) => {/* Handle tag click */}}
                    />
                  </FeedProvider>
                </motion.div>
              ) : (
                <motion.div key={activeTab + searchQuery} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {filteredPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                      <p className="text-4xl mb-3">🔍</p>
                      <p className="font-bold text-white mb-1.5">No posts found</p>
                      <p className="text-xs text-[#71767b]">Try a different search term</p>
                    </div>
                  ) : filteredPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onPostClick={setSelectedPost}
                      onUserClick={setSelectedUser}
                      onShare={setSharePost}
                      onMore={setMorePost}
                      currentUserId={currentUserId}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : null}

        {selectedPost ? (
          <motion.div
            key="post-thread"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <PostThreadPage
              post={selectedPost}
              onBack={() => setSelectedPost(null)}
              onUserClick={(name) => { setSelectedPost(null); setSelectedUser(name); }}
            />
          </motion.div>
        ) : null}

        {selectedMatch ? (
          <motion.div
            key="match-detail"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <MatchDetailPage onBack={() => setSelectedMatch(null)} />
          </motion.div>
        ) : null}

        {selectedUser ? (
          <motion.div
            key="user-profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <UserProfileView userName={selectedUser} onBack={() => setSelectedUser(null)} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Floating Post Button */}
      <AnimatePresence>
        {showButton && !selectedPost && !selectedMatch && !selectedUser && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }} onClick={() => setShowModal(true)}
            className="hidden md:flex fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-[#dc2626] to-[#ef4444] rounded-full items-center justify-center shadow-xl shadow-red-500/40 z-20"
          >
            <Plus className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <PostModal
            onClose={() => setShowModal(false)}
            onPost={handleNewPost}
            onOpenPoll={() => setShowPoll(true)}
          />
        )}
        {sharePost && (
          <ShareSheet
            onClose={() => setSharePost(null)}
            postContent={sharePost.content}
          />
        )}
        {morePost && (
          <MoreMenu
            onClose={() => setMorePost(null)}
            userName={morePost.user.name}
          />
        )}
        {showPoll && (
          <PollCreator
            onClose={() => setShowPoll(false)}
            onCreate={handleNewPoll}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
