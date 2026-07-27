import { motion, AnimatePresence } from 'framer-motion';
import { useFeed } from '../../hooks/feed/useFeed';
import { useInfiniteScroll } from '../../hooks/feed/useInfiniteScroll';
import { FeedCardRenderer } from '../cards/FeedCardRenderer';
import type { FeedCard, CardType } from '../../types/feed';

interface FeedContainerProps {
  filter?: CardType | 'all';
  onUserClick?: (userId: string) => void;
  onMatchClick?: (matchId: string) => void;
  onFollowClick?: (userId: string) => void;
  onTagClick?: (tag: string) => void;
}

export function FeedContainer({
  filter = 'all',
  onUserClick,
  onMatchClick,
  onFollowClick,
  onTagClick,
}: FeedContainerProps) {
  const { cards, loading, hasMore, error, loadMore } = useFeed({
    limit: 10,
    sort: 'new',
    filter: filter === 'all' ? undefined : [filter],
  });

  const { containerRef, sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    isLoading: loading,
    hasMore,
    threshold: 1000,
  });

  return (
    <div ref={containerRef} className="w-full space-y-4">
      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3 text-sm text-[#ef4444]"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed Cards */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {cards.map((card: FeedCard, index: number) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <FeedCardRenderer
                card={card}
                onUserClick={onUserClick}
                onMatchClick={onMatchClick}
                onFollowClick={onFollowClick}
                onTagClick={onTagClick}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} className="py-8">
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3"
          >
            <div className="w-8 h-8 rounded-full border-2 border-[#ef4444]/30 border-t-[#ef4444] animate-spin" />
            <p className="text-sm text-[#71767b]">Loading more...</p>
          </motion.div>
        )}

        {!hasMore && cards.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-[#71767b]"
          >
            You've reached the end of the feed
          </motion.p>
        )}
      </div>

      {/* Empty State */}
      {cards.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="text-4xl mb-3">📺</div>
          <p className="font-bold text-white mb-1">No posts yet</p>
          <p className="text-sm text-[#71767b]">
            Check back later for the latest sports predictions and analysis
          </p>
        </motion.div>
      )}
    </div>
  );
}
