import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { VideoCard as VideoCardType } from '../../types/feed';
import { formatDuration, formatNumber } from '../../utils/feed/feedUtils';
import { useIntersectionObserver } from '../../hooks/feed/useIntersectionObserver';
import { useVideoPlayer } from '../../hooks/feed/useVideoPlayer';
import { useFeedStore } from '../../stores/feedStore';

interface VideoCardProps {
  card: VideoCardType;
  onUserClick?: (userId: string) => void;
  onMatchClick?: (matchId: string) => void;
}

export function VideoCard({ card }: VideoCardProps) {
  const { ref, isVisible } = useIntersectionObserver({
    threshold: 0.7,
  });

  const { videoRef, isPlaying, progress, duration, currentTime, togglePlay, seek } = useVideoPlayer({
    isVisible,
    autoplay: true,
  });

  const { likeCard, bookmarkCard } = useFeedStore();
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [liked, setLiked] = useState(card.liked || false);
  const [bookmarked, setBookmarked] = useState(card.bookmarked || false);
  const [likes, setLikes] = useState(card.likes);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
    likeCard(card.id);
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    bookmarkCard(card.id);
  };

  const handleSeek = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * duration);
  };

  return (
    <motion.div
      ref={ref as any}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-[#0a0a0a] rounded-2xl overflow-hidden border border-[#1f1f1f] shadow-2xl"
    >
      {/* Video Container */}
      <div
        className="relative w-full bg-black aspect-video overflow-hidden group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          ref={videoRef}
          src={card.videoUrl}
          className="w-full h-full object-cover"
          preload="metadata"
          crossOrigin="anonymous"
        />

        {/* Live Badge */}
        <AnimatePresence>
          {card.isLive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-3 left-3 z-40 flex items-center gap-1.5 bg-[#ef4444]/90 backdrop-blur-md px-3 py-1.5 rounded-full"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-black text-white">LIVE</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play/Pause Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm group-hover:bg-black/50 transition-colors"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-[#ef4444] flex items-center justify-center shadow-lg hover:bg-[#dc2626] transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 text-white fill-white" />
            ) : (
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            )}
          </motion.button>
        </motion.div>

        {/* Controls Bar */}
        <AnimatePresence>
          {(showControls || !isPlaying) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 space-y-2"
            >
              {/* Progress Bar */}
              <div
                className="w-full h-1 bg-white/20 rounded-full cursor-pointer hover:h-1.5 transition-all group"
                onPointerDown={handleSeek}
              >
                <motion.div
                  className="h-full bg-[#ef4444] rounded-full"
                  style={{ width: `${progress}%` }}
                  layoutId="progress"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 text-white fill-white" />
                    ) : (
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-white" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-white" />
                    )}
                  </button>

                  <span className="text-xs text-white/70 ml-2">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </div>

                <div className="text-xs text-white/70">
                  {formatNumber(card.views ?? 0)} views
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Side Overlay - Actions */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-3 bottom-20 z-20 flex flex-col gap-4"
        >
          {/* Like */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLike}
            className={cn(
              'flex flex-col items-center gap-1 transition-colors',
              liked ? 'text-[#ef4444]' : 'text-white/70 hover:text-white'
            )}
          >
            <motion.div
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.1 }}
            >
              <Heart className={cn('w-5 h-5', liked && 'fill-[#ef4444]')} />
            </motion.div>
            <span className="text-xs font-semibold">{formatNumber(likes)}</span>
          </motion.button>

          {/* Comment */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="text-white/70 hover:text-white transition-colors"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">{formatNumber(card.comments ?? 0)}</span>
          </motion.button>

          {/* Share */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="text-white/70 hover:text-white transition-colors"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">{formatNumber(card.shares ?? 0)}</span>
          </motion.button>

          {/* Bookmark */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBookmark}
            className={cn(
              'transition-colors',
              bookmarked ? 'text-[#ef4444]' : 'text-white/70 hover:text-white'
            )}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
              <Bookmark className={cn('w-5 h-5', bookmarked && 'fill-[#ef4444]')} />
            </div>
          </motion.button>
        </motion.div>
      </div>

      {/* Card Info */}
      <div className="p-4 space-y-3">
        {/* Title and Description (Caption) */}
        <div>
          <h3 className="font-bold text-white text-sm leading-tight mb-1">{card.title}</h3>
          <p className="text-xs text-[#71767b] line-clamp-2">{card.description}</p>
        </div>
      </div>
    </motion.div>
  );
}
