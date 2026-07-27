import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { PredictionCard as PredictionCardType } from '../../types/feed';
import { formatTime, formatNumber } from '../../utils/feed/feedUtils';
import { useFeedStore } from '../../stores/feedStore';

interface PredictionCardProps {
  card: PredictionCardType;
  onUserClick?: (userId: string) => void;
  onMatchClick?: (matchId: string) => void;
}

export function PredictionCard({ card, onUserClick, onMatchClick }: PredictionCardProps) {
  const { likeCard, bookmarkCard } = useFeedStore();
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-[#0a0a0a] rounded-2xl border border-[#1f1f1f] p-4 space-y-4 shadow-xl hover:border-[#ef4444]/30 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 rounded-full bg-[#ef4444] flex items-center justify-center font-bold text-white cursor-pointer"
            onClick={() => onUserClick?.(card.user.id)}
          >
            {card.user.avatar}
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUserClick?.(card.user.id)}
                className="font-bold text-white hover:underline text-sm truncate"
              >
                {card.user.name}
              </button>
              {card.user.verified && (
                <span className="text-[#ef4444] text-xs">✓</span>
              )}
              {card.user.tipster && (
                <span className="text-[10px] font-bold bg-[#ef4444]/10 text-[#ef4444] px-2 py-0.5 rounded-full">
                  TIPSTER
                </span>
              )}
            </div>
            <p className="text-xs text-[#71767b]">{formatTime(card.timestamp)}</p>
          </div>
        </div>

        <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <MoreHorizontal className="w-4 h-4 text-[#71767b]" />
        </button>
      </div>

      {/* Match Card */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={() => onMatchClick?.(card.match.id)}
        className="w-full p-3 bg-gradient-to-r from-[#111]/80 to-[#0a0a0a] rounded-xl border border-[#ef4444]/20 hover:border-[#ef4444]/50 transition-all"
      >
        <div className="text-xs text-[#71767b] mb-2">{card.match.league}</div>
        <div className="flex items-center justify-between">
          <div className="text-left flex-1">
            <p className="font-bold text-white text-sm">{card.match.home}</p>
          </div>
          <div className="flex items-center gap-1 px-2">
            <div className="flex items-center gap-0.5 bg-[#ef4444]/20 rounded px-1.5 py-0.5">
              <span className="text-xs font-black text-[#ef4444]">{card.match.homeScore}</span>
              <span className="text-[10px] text-[#71767b]">-</span>
              <span className="text-xs font-black text-[#ef4444]">{card.match.awayScore}</span>
            </div>
          </div>
          <div className="text-right flex-1">
            <p className="font-bold text-white text-sm">{card.match.away}</p>
          </div>
        </div>
      </motion.button>

      {/* Prediction */}
      <div className="space-y-2">
        <div className="bg-[#111] rounded-xl p-3 border border-[#ef4444]/10">
          <p className="text-sm font-semibold text-white mb-2">Prediction</p>
          <p className="text-sm text-[#e7e9ea]">{card.prediction}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#111] rounded-lg p-2.5 text-center border border-[#1f1f1f] hover:border-[#ef4444]/30 transition-colors">
            <div className="text-xs text-[#71767b] mb-1">Odds</div>
            <p className="text-sm font-bold text-[#ef4444]">{card.odds.toFixed(2)}</p>
          </div>

          <div className="bg-[#111] rounded-lg p-2.5 text-center border border-[#1f1f1f] hover:border-[#ef4444]/30 transition-colors">
            <div className="text-xs text-[#71767b] mb-1">Potential</div>
            <p className="text-sm font-bold text-[#ef4444]">${card.potentialReturn}</p>
          </div>

          <div className="bg-[#111] rounded-lg p-2.5 text-center border border-[#1f1f1f] hover:border-[#ef4444]/30 transition-colors">
            <div className="text-xs text-[#71767b] mb-1">Confidence</div>
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#ef4444]" />
              <p className="text-sm font-bold text-[#ef4444]">{card.confidence}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="flex items-center justify-between text-xs text-[#71767b] px-2">
        <span>{formatNumber(card.views ?? 0)} views</span>
        <span>{formatNumber(card.comments ?? 0)} comments</span>
        <span>{formatNumber(card.reposts ?? 0)} reposts</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-around pt-2 border-t border-[#1f1f1f]">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLike}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
            liked
              ? 'text-[#ef4444] bg-[#ef4444]/10'
              : 'text-[#71767b] hover:text-[#ef4444] hover:bg-[#ef4444]/5'
          )}
        >
          <Heart className={cn('w-4 h-4', liked && 'fill-[#ef4444]')} />
          <span className="text-xs font-semibold">{formatNumber(likes)}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#71767b] hover:text-[#ef4444] hover:bg-[#ef4444]/5 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs font-semibold">{formatNumber(card.comments ?? 0)}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#71767b] hover:text-[#ef4444] hover:bg-[#ef4444]/5 transition-all"
        >
          <Repeat2 className="w-4 h-4" />
          <span className="text-xs font-semibold">{formatNumber(card.reposts ?? 0)}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBookmark}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
            bookmarked
              ? 'text-[#ef4444] bg-[#ef4444]/10'
              : 'text-[#71767b] hover:text-[#ef4444] hover:bg-[#ef4444]/5'
          )}
        >
          <Bookmark className={cn('w-4 h-4', bookmarked && 'fill-[#ef4444]')} />
        </motion.button>
      </div>
    </motion.div>
  );
}
