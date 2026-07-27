import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Repeat2, Bookmark, Share } from 'lucide-react';
import { useFeedStore } from '../../stores/feedStore';
import type { AnalysisCard as AnalysisCardType } from '../../types/feed';

interface AnalysisCardProps {
  card: AnalysisCardType;
  onUserClick?: (userId: string) => void;
  onMatchClick?: (matchId: string) => void;
}

export function AnalysisCard({ card, onUserClick, onMatchClick }: AnalysisCardProps) {
  const [liked, setLiked] = useState(card.liked || false);
  const [bookmarked, setBookmarked] = useState(card.bookmarked || false);
  const [likes, setLikes] = useState(card.likes || 0);
  const { likeCard, bookmarkCard } = useFeedStore();

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
      layout
      className="bg-[#0a0a0a] rounded-2xl border border-[#1f1f1f] overflow-hidden hover:border-[#ef4444]/30 transition-colors"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3 mb-3">
          <motion.img
            whileHover={{ scale: 1.05 }}
            src={card.user.avatar}
            alt={card.user.name}
            className="w-12 h-12 rounded-full object-cover cursor-pointer"
            onClick={() => onUserClick?.(card.user.id)}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-white truncate">{card.user.name}</p>
              {card.user.verified && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 bg-[#ef4444] rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <span className="text-xs font-bold text-white">✓</span>
                </motion.div>
              )}
              {card.user.tipster && (
                <span className="px-2 py-0.5 bg-[#ef4444]/20 border border-[#ef4444]/50 rounded text-xs font-semibold text-[#ef4444] flex-shrink-0">
                  Tipster
                </span>
              )}
            </div>
            <p className="text-xs text-[#71767b]">@{card.user.handle}</p>
          </div>
          <button className="text-[#71767b] hover:text-[#ef4444] transition-colors">⋯</button>
        </div>
      </div>

      {/* Match Info */}
      {card.match && (
        <motion.div
          whileHover={{ backgroundColor: '#1f1f1f' }}
          onClick={() => onMatchClick?.(card.match!.id)}
          className="px-4 py-3 border-b border-[#1f1f1f] cursor-pointer"
        >
          <p className="text-xs text-[#71767b] mb-2">{card.match.league}</p>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-right">
              <p className="font-bold text-white">{card.match.home}</p>
            </div>
            <div className="px-3 text-center">
              <p className="font-bold text-[#ef4444]">{card.match.homeScore} - {card.match.awayScore}</p>
              <p className="text-xs text-[#71767b] mt-1">{card.match.status}</p>
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">{card.match.away}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Analysis Content */}
      <div className="p-4 border-b border-[#1f1f1f]">
        <h3 className="font-bold text-white mb-2">{card.title}</h3>
        <p className="text-sm text-[#e7e9ea] leading-relaxed mb-3">{card.content}</p>

        {/* Key Points */}
        {card.keyPoints && card.keyPoints.length > 0 && (
          <div className="space-y-2 mb-3 p-3 bg-[#1f1f1f] rounded-lg">
            <p className="text-xs font-semibold text-[#ef4444] uppercase">Key Points</p>
            <ul className="space-y-1">
              {card.keyPoints.map((point: string, idx: number) => (
                <li key={idx} className="text-xs text-[#71767b] flex gap-2">
                  <span className="text-[#ef4444]">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Analysis Stats */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            whileHover={{ backgroundColor: '#1f1f1f' }}
            className="p-2 rounded-lg text-center"
          >
            <p className="text-xs text-[#71767b] mb-1">Confidence</p>
            <p className="font-bold text-[#ef4444]">{card.confidence}%</p>
          </motion.div>
          <motion.div
            whileHover={{ backgroundColor: '#1f1f1f' }}
            className="p-2 rounded-lg text-center"
          >
            <p className="text-xs text-[#71767b] mb-1">Win Rate</p>
            <p className="font-bold text-white">{card.winRate}%</p>
          </motion.div>
          <motion.div
            whileHover={{ backgroundColor: '#1f1f1f' }}
            className="p-2 rounded-lg text-center"
          >
            <p className="text-xs text-[#71767b] mb-1">ROI</p>
            <p className="font-bold text-white">{card.roi}%</p>
          </motion.div>
        </div>
      </div>

      {/* Engagement Buttons */}
      <div className="px-4 py-3 flex items-center justify-between text-[#71767b]">
        <motion.button
          whileHover={{ scale: 1.1, color: '#ef4444' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLike}
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
          className="flex items-center gap-2 hover:text-[#ef4444] transition-colors"
        >
          <MessageCircle size={18} />
          <span className="text-xs">{card.comments || 0}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1, color: '#ef4444' }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 hover:text-[#ef4444] transition-colors"
        >
          <Repeat2 size={18} />
          <span className="text-xs">{card.reposts || 0}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1, color: '#ef4444' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBookmark}
          className={`flex items-center gap-2 transition-colors ${
            bookmarked ? 'text-[#ef4444]' : 'hover:text-[#ef4444]'
          }`}
        >
          <Bookmark size={18} fill={bookmarked ? '#ef4444' : 'none'} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1, color: '#ef4444' }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 hover:text-[#ef4444] transition-colors"
        >
          <Share size={18} />
        </motion.button>
      </div>
    </motion.div>
  );
}
