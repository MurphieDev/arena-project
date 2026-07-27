import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageCircle, Share2, Bookmark, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Match {
  team: string;
  odds: string;
  status: 'win' | 'loss' | 'pending';
}

interface PredictionCardProps {
  code: string;
  userAvatar?: string;
  userName: string;
  userHandle: string;
  userStats: { wins: number; losses: number; streak: number };
  verified?: boolean;
  matches: Match[];
  totalOdds: number;
  timestamp: string;
  reactions: { like: number; heart: number; fire: number; laugh: number; wow: number };
  comments?: number;
}

export function PredictionCard({
  code,
  userAvatar,
  userName,
  userHandle,
  userStats,
  verified,
  matches,
  totalOdds,
  timestamp,
  reactions,
  comments = 0,
}: PredictionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);

  const [copied, setCopied] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#111] to-[#0d0d0d] border border-[#1f1f1f] rounded-2xl overflow-hidden hover:border-[#ef4444]/30 transition-all max-w-xs w-full"
    >
      {/* Header with User Info */}
      <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white font-bold bg-[#1e1e1e]">
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#ef4444] to-[#dc2626] flex items-center justify-center text-xs">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-sm text-white truncate">{userName}</p>
            {verified && <span className="text-[#ef4444]">✓</span>}
          </div>
          <p className="text-xs text-[#71767b]">@{userHandle}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-green-400">{userStats.wins}W</p>
          <p className="text-xs text-[#71767b]">{userStats.losses}L</p>
        </div>
      </div>

      {/* Prediction Code */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleCopyCode}
            className="text-sm font-bold text-[#ef4444] hover:text-[#ff6b6b] active:scale-95 transition-all flex items-center gap-1.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 px-2 py-1 rounded-lg border border-[#ef4444]/20 select-all"
            title="Click to copy game code"
          >
            <span>🎯 {code}</span>
            {copied ? (
              <span className="text-[10px] bg-green-500/20 text-green-400 px-1 rounded flex items-center gap-0.5 font-bold">
                <Check className="w-2.5 h-2.5" /> Copied
              </span>
            ) : (
              <span className="text-[9px] text-[#71767b] font-normal opacity-80">
                📋 copy
              </span>
            )}
          </button>
          <span className="text-[10px] text-[#71767b]">{timestamp}</span>
        </div>

        {/* Matches */}
        <div className="space-y-2">
          {matches.slice(0, expanded ? undefined : 3).map((match, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <span className="text-sm text-white flex items-center gap-2">
                {match.status === 'win' && <Check className="w-4 h-4 text-green-400" />}
                {match.status === 'loss' && <X className="w-4 h-4 text-red-400" />}
                {match.status === 'pending' && <span className="text-yellow-400">⏳</span>}
                {match.team}
              </span>
              <span className="text-xs font-bold text-[#71767b]">{match.odds}</span>
            </div>
          ))}
        </div>

        {matches.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
          >
            {expanded ? 'Show less' : `Show all ${matches.length} games`}
            <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
          </button>
        )}

        {/* Total Odds */}
        <div className="mt-3 p-2 rounded-lg bg-gradient-to-r from-[#ef4444]/10 to-transparent border border-[#ef4444]/20">
          <p className="text-xs text-[#71767b]">Total Odds</p>
          <p className="text-lg font-black text-[#ef4444]">{totalOdds.toFixed(2)}</p>
        </div>
      </div>

      {/* Reactions & Actions */}
      <div className="px-4 py-3 border-t border-[#1f1f1f]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-3 text-xs text-[#71767b]">
            <span>👍 {reactions.like}</span>
            <span>❤️ {reactions.heart}</span>
            <span>🔥 {reactions.fire}</span>
            <span>😂 {reactions.laugh}</span>
            <span>😮 {reactions.wow}</span>
          </div>
          {comments > 0 && (
            <span className="text-xs font-semibold text-[#71767b] flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {comments}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setLiked(!liked)}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
              liked
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/5 text-[#71767b] hover:bg-white/10 border border-[#1f1f1f]'
            )}
          >
            ❤️ {liked ? 'Liked' : 'Like'}
          </button>
          <button className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 text-[#71767b] hover:bg-white/10 border border-[#1f1f1f] transition-all flex items-center justify-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" />
            Comment
          </button>
          <button className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 text-[#71767b] hover:bg-white/10 border border-[#1f1f1f] transition-all">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 text-[#71767b] hover:bg-white/10 border border-[#1f1f1f] transition-all">
            <Bookmark className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[#1f1f1f] bg-black/50"
          >
            <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
              {/* Sample Comments */}
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  J
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white">Jake Pro</p>
                    <span className="text-[10px] text-[#71767b]">2m ago</span>
                  </div>
                  <p className="text-xs text-[#71767b] mt-0.5">Tailing this! Love the stats 🔥</p>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  S
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white">Sam Tips</p>
                    <span className="text-[10px] text-[#71767b]">1m ago</span>
                  </div>
                  <p className="text-xs text-[#71767b] mt-0.5">Nice parlay odds, let's see how it plays out</p>
                </div>
              </div>

              {/* Add Comment Input */}
              <div className="pt-3 border-t border-[#1f1f1f]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/30"
                  />
                  <button className="px-3 py-2 rounded-lg bg-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/30 transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
