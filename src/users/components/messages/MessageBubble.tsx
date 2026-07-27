import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';

export interface Message {
  id: string;
  text: string;
  time: string;
  mine: boolean;
  reaction?: string;
}

interface MessageBubbleProps {
  message: Message;
  index: number;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
}

export function MessageBubble({ message, index, onReact, onDelete }: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const timerRef = useRef<any>(null);

  const startPress = () => {
    timerRef.current = setTimeout(() => {
      setShowReactions(true);
    }, 500); // 500ms long press hold
  };

  const endPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const emojis = ['👍', '❤️', '🔥', '😂', '👏', '😢'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3 }}
      className={cn('flex relative mb-4', message.mine ? 'justify-end' : 'justify-start')}
    >
      <div 
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowReactions(true);
        }}
        onDoubleClick={() => setShowReactions(true)}
        className="relative group cursor-pointer select-none"
      >
        <div className={cn(
          'max-w-[280px] sm:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words relative transition-all duration-200',
          message.mine
            ? 'bg-[#ef4444] text-white rounded-br-sm shadow-md hover:bg-[#dc2626]'
            : 'bg-[#111] text-[#e7e9ea] border border-[#1f1f1f] rounded-bl-sm hover:bg-[#1a1a1a]'
        )}>
          <p className="font-medium">{message.text}</p>
          <p className={cn('text-[10px] mt-1.5 text-right', message.mine ? 'text-white/50' : 'text-[#71767b]')}>
            {message.time}
          </p>
        </div>

        {/* Reaction Badge */}
        {message.reaction && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              onReact(message.id, message.reaction!);
            }}
            className={cn(
              'absolute -bottom-2 flex items-center bg-[#151518] border border-[#2a2a30] rounded-full px-1.5 py-0.5 shadow-md z-10 cursor-pointer hover:bg-[#202025] hover:scale-105 transition-all text-xs select-none',
              message.mine ? 'right-3' : 'left-3'
            )}
          >
            {message.reaction}
          </motion.div>
        )}

        {/* Telegram Unified Context Menu (Reactions + Actions) */}
        <AnimatePresence>
          {showReactions && (
            <>
              {/* Overlay Backdrop to close picker */}
              <div 
                className="fixed inset-0 z-20 cursor-default" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReactions(false);
                }}
              />
              
              {/* Unified Dropdown Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={cn(
                  'absolute top-full mt-1.5 w-60 bg-[#18181b]/95 backdrop-blur-md border border-[#2a2a30] rounded-2xl shadow-2xl z-30 overflow-hidden',
                  message.mine ? 'right-0' : 'left-0'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Reactions Header Row */}
                <div className="flex items-center justify-between gap-1.5 px-3 py-2 bg-white/[0.03] border-b border-[#2a2a30]">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReact(message.id, emoji);
                        setShowReactions(false);
                      }}
                      className="text-lg hover:scale-130 active:scale-95 transition-all duration-150 p-1 hover:bg-white/10 rounded-lg flex-1 flex justify-center items-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Actions List */}
                <div className="py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReactions(false);
                      alert("Reply features coming soon");
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#e7e9ea] hover:bg-white/5 transition-colors font-semibold flex items-center gap-3"
                  >
                    <span className="text-sm">💬</span>
                    <span>Reply</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReactions(false);
                      navigator.clipboard.writeText(message.text);
                      alert("Message copied to clipboard!");
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#e7e9ea] hover:bg-white/5 transition-colors font-semibold flex items-center gap-3"
                  >
                    <span className="text-sm">📋</span>
                    <span>Copy Text</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReactions(false);
                      alert("Message pinned to top");
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#e7e9ea] hover:bg-white/5 transition-colors font-semibold flex items-center gap-3"
                  >
                    <span className="text-sm">📌</span>
                    <span>Pin Message</span>
                  </button>
                  <div className="h-px bg-[#2a2a30] my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReactions(false);
                      onDelete(message.id);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#ef4444] hover:bg-red-500/10 transition-colors font-semibold flex items-center gap-3"
                  >
                    <span className="text-sm">🗑️</span>
                    <span>Delete</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
