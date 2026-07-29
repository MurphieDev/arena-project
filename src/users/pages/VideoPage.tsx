import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Share, Bookmark,
  Play, Pause, Volume2, VolumeX, X,
  ChevronUp, ChevronDown, Maximize2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { db, auth } from '../../lib/firebase';
import {
  collection, onSnapshot, query as firestoreQuery,
  where, orderBy, doc, setDoc, deleteDoc,
  updateDoc, increment, serverTimestamp, getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface VideoPost {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatar?: string;
  videoUrl: string;
  caption: string;
  tag?: string;
  likes: number;
  comments: number;
  reposts: number;
  createdAt: any;
}

function Avatar({ name, image, size = 'md' }: { name: string; image?: string; size?: 'sm' | 'md' | 'lg' }) {
  const colors = ['bg-[#ef4444]', 'bg-blue-600', 'bg-green-600', 'bg-purple-600'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  if (image) return <img src={image} alt={name} className={cn('rounded-full object-cover shrink-0', sizes[size])} />;
  return (
    <div className={cn('rounded-full flex items-center justify-center font-black text-white shrink-0', sizes[size], color)}>
      {name?.[0]?.toUpperCase() || 'U'}
    </div>
  );
}

function VideoCard({ video, isActive, myId, onNext, onPrev }: {
  video: VideoPost; isActive: boolean; myId: string;
  onNext: () => void; onPrev: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [localLikes, setLocalLikes] = useState(video.likes || 0);
  const [showCaption, setShowCaption] = useState(true);
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  useEffect(() => {
    if (!myId || !video.id) return;
    Promise.all([
      getDoc(doc(db, 'posts', video.id, 'likes', myId)),
      getDoc(doc(db, 'users', myId, 'bookmarks', video.id)),
    ]).then(([likeDoc, bookmarkDoc]) => {
      setLiked(likeDoc.exists());
      setBookmarked(bookmarkDoc.exists());
    });
  }, [video.id, myId]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play().then(() => setPlaying(true)); }
  };

  const handleLike = async () => {
    if (!myId) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLocalLikes(n => n + (newLiked ? 1 : -1));
    const likeRef = doc(db, 'posts', video.id, 'likes', myId);
    if (newLiked) {
      await setDoc(likeRef, { userId: myId, createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'posts', video.id), { likes: increment(1) });
    } else {
      await deleteDoc(likeRef);
      await updateDoc(doc(db, 'posts', video.id), { likes: increment(-1) });
    }
  };

  const handleBookmark = async () => {
    if (!myId) return;
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    const ref = doc(db, 'users', myId, 'bookmarks', video.id);
    if (newBookmarked) await setDoc(ref, { postId: video.id, createdAt: serverTimestamp() });
    else await deleteDoc(ref);
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        loop
        muted={muted}
        playsInline
        className="w-full h-full object-cover"
        onClick={togglePlay}
      />

      {/* Play/Pause overlay */}
      <AnimatePresence>
        {!playing && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Play className="w-10 h-10 text-white fill-white ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        <button onClick={() => setMuted(m => !m)}
          className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
          {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>
        <button onClick={togglePlay}
          className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
          {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white fill-white" />}
        </button>
      </div>

      {/* Navigate up/down */}
      <button onClick={onPrev} className="absolute top-1/3 right-2 w-10 h-10 flex items-center justify-center z-20 opacity-60 hover:opacity-100">
        <ChevronUp className="w-8 h-8 text-white drop-shadow" />
      </button>
      <button onClick={onNext} className="absolute bottom-1/3 right-2 w-10 h-10 flex items-center justify-center z-20 opacity-60 hover:opacity-100">
        <ChevronDown className="w-8 h-8 text-white drop-shadow" />
      </button>

      {/* Right action buttons */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5 z-20">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', liked ? 'bg-[#ef4444]' : 'bg-black/40 backdrop-blur-sm')}>
            <Heart className={cn('w-6 h-6', liked ? 'text-white fill-white' : 'text-white')} />
          </div>
          <span className="text-white text-xs font-bold drop-shadow">{fmt(localLikes)}</span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow">{fmt(video.comments || 0)}</span>
        </button>

        <button onClick={handleBookmark} className="flex flex-col items-center gap-1">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', bookmarked ? 'bg-[#ef4444]' : 'bg-black/40 backdrop-blur-sm')}>
            <Bookmark className={cn('w-6 h-6', bookmarked ? 'text-white fill-white' : 'text-white')} />
          </div>
        </button>

        <button onClick={() => navigator.share?.({ text: video.caption, url: window.location.href })}
          className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Share className="w-6 h-6 text-white" />
          </div>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 z-20 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <Avatar name={video.userName || 'User'} image={video.userAvatar} size="md" />
          <div>
            <p className="font-bold text-white text-sm">{video.userName}</p>
            <p className="text-white/60 text-xs">{video.userHandle}</p>
          </div>
        </div>
        {video.tag && (
          <span className="inline-block text-[10px] text-[#ef4444] bg-[#ef4444]/20 px-2 py-0.5 rounded-full mb-1 font-bold">{video.tag}</span>
        )}
        {showCaption && video.caption && (
          <p className="text-white text-sm leading-relaxed line-clamp-3" onClick={() => setShowCaption(false)}>
            {video.caption}
          </p>
        )}
      </div>
    </div>
  );
}

export function VideoPage() {
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myId, setMyId] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setMyId(user?.uid || ''));
    return () => unsub();
  }, []);

  useEffect(() => {
    // Load posts that have videos
    const unsub = onSnapshot(
      firestoreQuery(collection(db, 'posts'), where('video', '!=', null), orderBy('video'), orderBy('createdAt', 'desc')),
      snap => {
        const videoList = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as VideoPost))
          .filter(p => p.videoUrl || (p as any).video)
          .map(p => ({ ...p, videoUrl: p.videoUrl || (p as any).video }));
        setVideos(videoList);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const handleNext = () => setCurrentIndex(i => Math.min(i + 1, videos.length - 1));
  const handlePrev = () => setCurrentIndex(i => Math.max(i - 1, 0));

  // Swipe handling
  const touchStart = useRef<number>(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) { if (diff > 0) handleNext(); else handlePrev(); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (videos.length === 0) return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-center px-8">
      <p className="text-5xl mb-4">🎬</p>
      <p className="font-bold text-white text-lg mb-2">No videos yet</p>
      <p className="text-[#71767b] text-sm">Be the first to share a sports video</p>
    </div>
  );

  return (
    <div ref={containerRef}
      className="fixed inset-0 bg-black z-10 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      <AnimatePresence mode="wait">
        <motion.div key={currentIndex}
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.25 }}
          className="w-full h-full">
          <VideoCard
            video={videos[currentIndex]}
            isActive={true}
            myId={myId}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        </motion.div>
      </AnimatePresence>

      {/* Video counter */}
      <div className="absolute top-4 left-4 z-30 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
        <span className="text-white text-xs font-bold">{currentIndex + 1} / {videos.length}</span>
      </div>

      {/* Progress dots */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-30">
        {videos.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, i) => (
          <div key={i} className={cn('rounded-full transition-all', i === Math.min(2, currentIndex) ? 'w-1.5 h-4 bg-white' : 'w-1 h-1.5 bg-white/40')} />
        ))}
      </div>
    </div>
  );
}
