import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, UserPlus, TrendingUp } from 'lucide-react';
import type { UserCard as UserCardType } from '../../types/feed';

interface UserCardProps {
  card: UserCardType;
  onUserClick?: (userId: string) => void;
  onFollowClick?: (userId: string) => void;
}

export function UserCard({ card, onUserClick, onFollowClick }: UserCardProps) {
  const [isFollowing, setIsFollowing] = useState(card.following || false);
  const [followers, setFollowers] = useState(card.user.followers ?? 0);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    setFollowers(isFollowing ? followers - 1 : followers + 1);
    onFollowClick?.(card.user.id);
  };

  return (
    <motion.div
      layout
      className="bg-[#0a0a0a] rounded-2xl border border-[#1f1f1f] overflow-hidden hover:border-[#ef4444]/30 transition-colors"
    >
      {/* Banner */}
      <div className="h-20 bg-gradient-to-r from-[#ef4444]/20 to-[#1f1f1f] relative overflow-hidden">
        <motion.div
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(45deg, transparent 30%, rgba(239, 68, 68, 0.1) 50%, transparent 70%)',
            backgroundSize: '200% 200%',
          }}
        />
      </div>

      {/* Profile Section */}
      <div className="px-4 pb-4 relative -mt-6">
        <div className="flex items-end justify-between mb-3">
          <motion.img
            whileHover={{ scale: 1.05 }}
            src={card.user.avatar}
            alt={card.user.name}
            className="w-16 h-16 rounded-full border-4 border-[#0a0a0a] object-cover cursor-pointer"
            onClick={() => onUserClick?.(card.user.id)}
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleFollow}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-sm transition-colors ${
              isFollowing
                ? 'bg-[#1f1f1f] text-white border border-[#1f1f1f]'
                : 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
            }`}
          >
            <UserPlus size={16} />
            {isFollowing ? 'Following' : 'Follow'}
          </motion.button>
        </div>

        {/* User Info */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-bold text-white">{card.user.name}</h3>
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
              <span className="px-2 py-0.5 bg-[#ef4444]/20 border border-[#ef4444]/50 rounded text-xs font-semibold text-[#ef4444]">
                Tipster
              </span>
            )}
          </div>
          <p className="text-sm text-[#71767b] mb-2">@{card.user.handle}</p>
          {card.bio && <p className="text-sm text-[#e7e9ea]">{card.bio}</p>}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-[#1f1f1f] rounded-lg border border-[#1f1f1f]">
          <div className="text-center">
            <p className="text-xs text-[#71767b] mb-1">Posts</p>
            <p className="font-bold text-white">{card.postCount}</p>
          </div>
          <div className="text-center border-l border-r border-[#0a0a0a]">
            <p className="text-xs text-[#71767b] mb-1">Followers</p>
            <p className="font-bold text-white">{followers.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#71767b] mb-1">Following</p>
            <p className="font-bold text-white">{card.followingCount}</p>
          </div>
        </div>

        {/* Performance Metrics */}
        {card.performance && (
          <div className="space-y-2 mb-3 p-3 bg-[#1f1f1f] rounded-lg border border-[#1f1f1f]">
            <p className="text-xs font-semibold text-[#ef4444] uppercase flex items-center gap-1.5">
              <TrendingUp size={14} /> Performance
            </p>
            <div className="space-y-1">
              {Object.entries(card.performance).map(([key, value]: [string, any]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-[#71767b] capitalize">{key}</span>
                  <span className="text-white font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Preview */}
        {card.recentActivity && card.recentActivity.length > 0 && (
          <div className="mb-3 space-y-2">
            <p className="text-xs font-semibold text-[#71767b] uppercase">Recent</p>
            {card.recentActivity.map((activity: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ backgroundColor: '#1f1f1f' }}
                className="p-2 rounded-lg text-xs text-[#e7e9ea] cursor-pointer"
              >
                <p>{activity}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Badges */}
        {card.badges && card.badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {card.badges.map((badge: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="px-2 py-1 rounded-full text-xs font-semibold bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30"
              >
                {badge}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Engagement Footer */}
      <div className="px-4 py-3 border-t border-[#1f1f1f] flex items-center justify-between text-[#71767b]">
        <motion.button
          whileHover={{ scale: 1.1, color: '#ef4444' }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 hover:text-[#ef4444] transition-colors"
        >
          <Heart size={18} />
          <span className="text-xs">{card.likes || 0}</span>
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
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onUserClick?.(card.user.id)}
          className="ml-auto px-4 py-1.5 rounded-full bg-[#ef4444] text-white text-xs font-semibold hover:bg-[#dc2626] transition-colors"
        >
          View Profile
        </motion.button>
      </div>
    </motion.div>
  );
}
