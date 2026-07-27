import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../auth/hooks/AuthContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FeedContainer } from '../components/feed/FeedContainer';

export function FeedPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<'all' | 'following' | 'trending'>('all');

  const handleUserClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const handleMatchClick = (matchId: string) => {
    navigate(`/match/${matchId}`);
  };

  const { user } = useAuth();
  const currentUser = user as any;
  const myId = currentUser?.id || currentUser?.uid || '';

  const handleFollowClick = async (userId: string) => {
    if (!myId || !userId) return;
    const followRef = doc(db, 'users', myId, 'following', userId);
    const followerRef = doc(db, 'users', userId, 'followers', myId);
    await setDoc(followRef, { userId, createdAt: serverTimestamp() });
    await setDoc(followerRef, { userId: myId, createdAt: serverTimestamp() });
  };

  const handleTagClick = (tag: string) => {
    navigate(`/search?q=%23${tag}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-3xl font-bold text-white mb-2">Sports Feed</h1>
            <p className="text-[#71767b]">
              Discover predictions, analysis, and live updates from the community
            </p>
          </motion.div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4">
            {(['all', 'following', 'trending'] as const).map((filter) => (
              <motion.button
                key={filter}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilters(filter)}
                className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
                  filters === filter
                    ? 'bg-[#ef4444] text-white'
                    : 'bg-[#1f1f1f] text-[#71767b] hover:text-white'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </motion.button>
            ))}
          </div>

          {/* Feed Container */}
          <FeedContainer
            onUserClick={handleUserClick}
            onMatchClick={handleMatchClick}
            onFollowClick={handleFollowClick}
            onTagClick={handleTagClick}
          />
        </div>
      </main>
    </div>
  );
}
