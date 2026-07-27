import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { FeedProvider } from '../stores/feedStore';
import { FeedContainer } from '../components/feed/FeedContainer';
import { useNavigate } from 'react-router-dom';

export function VideoPage() {
  const navigate = useNavigate();

  return (
    <FeedProvider>
      <div className="w-full">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Videos</h1>
              <p className="text-xs text-[#71767b] mt-0.5">Explore sports highlights and clips</p>
            </div>
          </div>
        </div>

        {/* Feed */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <FeedContainer
            filter="video"
            onUserClick={(_name: string) => {/* Handle user click */}}
            onMatchClick={(_matchId: string) => {/* Handle match click */}}
            onTagClick={(_tag: string) => {/* Handle tag click */}}
          />
        </motion.div>
      </div>
    </FeedProvider>
  );
}
