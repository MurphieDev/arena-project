import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Eye, Share } from 'lucide-react';
import { useFeedStore } from '../../stores/feedStore';
import type { LiveMatchCard as LiveMatchCardType } from '../../types/feed';

interface LiveMatchCardProps {
  card: LiveMatchCardType;
  onMatchClick?: (matchId: string) => void;
}

export function LiveMatchCard({ card, onMatchClick }: LiveMatchCardProps) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(card.likes || 0);
  const [timeElapsed, setTimeElapsed] = useState(card.timeElapsed || 0);
  const { likeCard } = useFeedStore();

  // Simulate time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed((prev: number) => prev + 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
    likeCard(card.id);
  };

  const isLive = card.status === 'LIVE';

  return (
    <motion.div
      layout
      onClick={() => onMatchClick?.(card.match.id)}
      className="bg-[#0a0a0a] rounded-2xl border border-[#1f1f1f] overflow-hidden hover:border-[#ef4444]/30 transition-colors cursor-pointer"
    >
      {/* Live Badge */}
      {isLive && (
        <div className="relative h-1 bg-gradient-to-r from-[#ef4444] to-transparent">
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-r from-[#ef4444] to-transparent"
          />
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLive && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-[#ef4444] rounded-full"
            />
          )}
          <p className="font-bold text-white">{card.match.league}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#71767b]">
          <Eye size={14} />
          <span>{card.viewers?.toLocaleString()}</span>
        </div>
      </div>

      {/* Match Score */}
      <div className="px-4 py-6 border-b border-[#1f1f1f]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-right">
            <p className="text-sm font-bold text-white mb-1">{card.match.home}</p>
            <p className="text-2xl font-bold text-white">{card.match.homeScore}</p>
          </div>

          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-center"
            >
              <p className="text-xs text-[#71767b] mb-2">{timeElapsed}'</p>
              <p className="text-xs font-semibold text-[#ef4444] uppercase">{card.status}</p>
            </motion.div>
          </div>

          <div className="flex-1">
            <p className="text-sm font-bold text-white mb-1">{card.match.away}</p>
            <p className="text-2xl font-bold text-white">{card.match.awayScore}</p>
          </div>
        </div>
      </div>

      {/* Live Commentary */}
      {card.liveCommentary && card.liveCommentary.length > 0 && (
        <div className="px-4 py-4 border-b border-[#1f1f1f] space-y-2 max-h-40 overflow-y-auto">
          <p className="text-xs font-semibold text-[#ef4444] uppercase mb-3">Live Commentary</p>
          {card.liveCommentary.slice(0, 3).map((comment: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs text-[#e7e9ea] pb-2 border-b border-[#1f1f1f] last:border-b-0"
            >
              <div className="flex gap-2">
                <span className="text-[#ef4444] font-semibold">{comment.minute}'</span>
                <span>{comment.text}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Match Stats */}
      {card.stats && (
        <div className="px-4 py-4 border-b border-[#1f1f1f]">
          <p className="text-xs font-semibold text-[#ef4444] uppercase mb-3">Match Stats</p>
          <div className="space-y-2">
            {Object.entries(card.stats).slice(0, 3).map(([key, value]: [string, any]) => (
              <div key={key} className="flex justify-between items-center text-xs">
                <span className="text-[#71767b]">{key}</span>
                <div className="flex gap-2">
                  <span className="text-white w-6 text-right">{value.home}</span>
                  <span className="text-white w-6 text-left">{value.away}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engagement */}
      <div className="px-4 py-3 flex items-center justify-between text-[#71767b]">
        <motion.button
          whileHover={{ scale: 1.1, color: '#ef4444' }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            handleLike();
          }}
          className={`flex items-center gap-2 transition-colors ${
            liked ? 'text-[#ef4444]' : 'hover:text-[#ef4444]'
          }`}
        >
          <Heart size={18} fill={liked ? '#ef4444' : 'none'} />
          <span className="text-xs">{likes}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1, color: '#ef4444' }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 hover:text-[#ef4444] transition-colors"
        >
          <MessageCircle size={18} />
          <span className="text-xs">{card.comments || 0}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1, color: '#ef4444' }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 hover:text-[#ef4444] transition-colors"
        >
          <Eye size={18} />
          <span className="text-xs">{card.viewers || 0}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1, color: '#ef4444' }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 hover:text-[#ef4444] transition-colors"
        >
          <Share size={18} />
        </motion.button>
      </div>
    </motion.div>
  );
}
