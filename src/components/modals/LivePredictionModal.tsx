import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LivePredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function LivePredictionModal({ isOpen, onClose, onSubmit }: LivePredictionModalProps) {
  const [match, setMatch] = useState('');
  const [prediction, setPrediction] = useState('');
  const [odds, setOdds] = useState('');

  const handleSubmit = () => {
    if (!match || !prediction.trim()) {
      alert('Please fill in all fields');
      return;
    }
    onSubmit({ match, prediction, odds, isLive: true });
    setMatch('');
    setPrediction('');
    setOdds('');
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
                  <h2 className="text-xl font-black text-white flex items-center gap-2">⚡ Live Prediction</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Post during active game</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-xs text-yellow-400 font-semibold">🔴 LIVE - Posting during active game</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Match</label>
                  <input
                    type="text"
                    value={match}
                    onChange={e => setMatch(e.target.value)}
                    placeholder="e.g., Man City vs Arsenal (2nd Half)"
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white outline-none focus:border-[#ef4444]/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Odds</label>
                    <input
                      type="text"
                      value={odds}
                      onChange={e => setOdds(e.target.value)}
                      placeholder="1.50"
                      className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white outline-none focus:border-[#ef4444]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Quick Prediction</label>
                  <textarea
                    value={prediction}
                    onChange={e => setPrediction(e.target.value)}
                    placeholder="What's your quick take on this in-play action?"
                    className="w-full h-24 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50 resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#1f1f1f] bg-black/50 flex gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#111] border border-[#1f1f1f] text-white">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!match || !prediction.trim()}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all',
                    match && prediction.trim()
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:shadow-lg'
                      : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] cursor-not-allowed'
                  )}
                >
                  <Zap className="w-4 h-4" />
                  Post Live
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
