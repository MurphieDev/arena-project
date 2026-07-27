import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SchedulePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function SchedulePostModal({ isOpen, onClose, onSubmit }: SchedulePostModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!date || !time || !content.trim()) {
      alert('Please fill in all fields');
      return;
    }
    onSubmit({ date, time, content, isScheduled: true });
    setDate('');
    setTime('');
    setContent('');
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
                  <h2 className="text-xl font-black text-white">📅 Schedule Post</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Post at a specific time</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white outline-none focus:border-[#ef4444]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Time</label>
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white outline-none focus:border-[#ef4444]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Post Content</label>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="What will you post?"
                    className="w-full h-24 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50 resize-none"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-xs text-blue-400 font-semibold">
                    ⏰ {date && time ? `Scheduled for ${date} at ${time}` : 'Pick a date and time'}
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#1f1f1f] bg-black/50 flex gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#111] border border-[#1f1f1f] text-white">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!date || !time || !content.trim()}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all',
                    date && time && content.trim()
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg'
                      : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] cursor-not-allowed'
                  )}
                >
                  <Calendar className="w-4 h-4" />
                  Schedule
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
