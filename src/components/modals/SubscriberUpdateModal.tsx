import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SubscriberUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function SubscriberUpdateModal({ isOpen, onClose, onSubmit }: SubscriberUpdateModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !message.trim()) {
      alert('Please fill in all fields');
      return;
    }
    onSubmit({ title, message, isExclusive: true });
    setTitle('');
    setMessage('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full max-w-xl bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-black/50">
                <div>
                  <h2 className="text-xl font-black text-white">💎 Subscriber Update</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Message for paid members only</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                  <p className="text-xs text-purple-400 font-semibold">🔒 This will only be visible to your paid subscribers</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Update title..."
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white outline-none focus:border-[#ef4444]/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Exclusive message for subscribers..."
                    className="w-full h-28 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50 resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#1f1f1f] bg-black/50 flex gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#111] border border-[#1f1f1f] text-white">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!title.trim() || !message.trim()}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all',
                    title.trim() && message.trim()
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
                      : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                  Send Update
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
