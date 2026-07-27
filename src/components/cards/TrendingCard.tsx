import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Heart, MessageCircle, Share } from 'lucide-react';
import type { TrendingCard as TrendingCardType } from '../../types/feed';

interface TrendingCardProps {
  card: TrendingCardType;
  onTagClick?: (tag: string) => void;
}

export function TrendingCard({ card, onTagClick }: TrendingCardProps) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(card.likes || 0);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  return (
    <motion.div
      layout
      className="bg-[#0a0a0a] rounded-2xl border border-[#1f1f1f] overflow-hidden hover:border-[#ef4444]/30 transition-colors"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <TrendingUp size={20} className="text-[#ef4444]" />
          </motion.div>
          <div>
            <p className="font-bold text-white">Trending Now</p>
            <p className="text-xs text-[#71767b]">{card.category}</p>
          </div>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-xs font-bold text-[#ef4444] bg-[#ef4444]/10 px-2 py-1 rounded"
        >
          #{card.rank}
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="p-4 border-b border-[#1f1f1f]">
        <motion.h3
          whileHover={{ color: '#ef4444' }}
          onClick={() => onTagClick?.(card.tag)}
          className="text-lg font-bold text-white mb-2 cursor-pointer hover:text-[#ef4444] transition-colors"
        >
          #{card.tag}
        </motion.h3>
        <p className="text-sm text-[#e7e9ea] mb-4">{card.description}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <motion.div
            whileHover={{ backgroundColor: '#1f1f1f' }}
            className="p-3 rounded-lg text-center border border-[#1f1f1f]"
          >
            <p className="text-xs text-[#71767b] mb-1">Posts</p>
            <p className="font-bold text-[#ef4444]">{card.postCount?.toLocaleString()}</p>
          </motion.div>
          <motion.div
            whileHover={{ backgroundColor: '#1f1f1f' }}
            className="p-3 rounded-lg text-center border border-[#1f1f1f]"
          >
            <p className="text-xs text-[#71767b] mb-1">Mentions</p>
            <p className="font-bold text-white">{card.mentionCount?.toLocaleString()}</p>
          </motion.div>
          <motion.div
            whileHover={{ backgroundColor: '#1f1f1f' }}
            className="p-3 rounded-lg text-center border border-[#1f1f1f]"
          >
            <p className="text-xs text-[#71767b] mb-1">Momentum</p>
            <p className="font-bold text-white">+{card.momentum}%</p>
          </motion.div>
        </div>

        {/* Top Posts Preview */}
        {card.topPosts && card.topPosts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#71767b] uppercase">Top Posts</p>
            {card.topPosts.slice(0, 2).map((post: any, idx: number) => (
              <motion.div
                key={idx}
                whileHover={{ backgroundColor: '#1f1f1f' }}
                className="p-2 rounded-lg border border-[#1f1f1f] cursor-pointer"
              >
                <p className="text-xs text-[#e7e9ea] line-clamp-2">{post.text}</p>
                <div className="flex gap-3 mt-2 text-xs text-[#71767b]">
                  <span>❤️ {post.likes}</span>
                  <span>💬 {post.comments}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Related Topics */}
      {card.relatedTopics && card.relatedTopics.length > 0 && (
        <div className="px-4 py-3 border-b border-[#1f1f1f]">
          <p className="text-xs font-semibold text-[#71767b] uppercase mb-2">Related</p>
          <div className="flex flex-wrap gap-2">
            {card.relatedTopics.map((topic: any, idx: number) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTagClick?.(topic)}
                className="px-3 py-1 rounded-full bg-[#1f1f1f] text-xs text-[#e7e9ea] hover:bg-[#ef4444]/10 hover:text-[#ef4444] transition-colors"
              >
                #{topic}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Footer */}
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
          <Share size={18} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onTagClick?.(card.tag)}
          className="ml-auto px-3 py-1 rounded-full bg-[#ef4444] text-white text-xs font-semibold hover:bg-[#dc2626] transition-colors"
        >
          Explore
        </motion.button>
      </div>
    </motion.div>
  );
}
