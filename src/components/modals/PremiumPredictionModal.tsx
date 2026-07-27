import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PremiumPredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function PremiumPredictionModal({ isOpen, onClose, onSubmit }: PremiumPredictionModalProps) {
  const [games, setGames] = useState([]);
  const [reasoning, setReasoning] = useState('');
  const [price, setPrice] = useState(4.99);

  const handleSubmit = () => {
    if (games.length === 0 || reasoning.trim().length === 0) {
      alert('Please select at least one game and add reasoning');
      return;
    }
    onSubmit({ games, reasoning, price, isPremium: true });
    setGames([]);
    setReasoning('');
    setPrice(4.99);
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
            <div className="w-full max-w-2xl max-h-[90vh] bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-black/50 backdrop-blur">
                <div>
                  <h2 className="text-xl font-black text-white">💎 Premium Prediction</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Exclusive locked prediction for paying members</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-xs text-yellow-400 font-semibold">🔒 Only visible to members who purchase access</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Price (USD)</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPrice(Math.max(0.99, price - 0.99))}
                      className="px-3 py-2 bg-[#111] border border-[#1f1f1f] rounded-lg hover:border-[#ef4444]/50"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={price}
                      onChange={e => setPrice(parseFloat(e.target.value) || 0.99)}
                      min="0.99"
                      step="0.99"
                      className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white outline-none focus:border-[#ef4444]/50 text-center"
                    />
                    <button
                      onClick={() => setPrice(price + 0.99)}
                      className="px-3 py-2 bg-[#111] border border-[#1f1f1f] rounded-lg hover:border-[#ef4444]/50"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Games & Reasoning</label>
                  <textarea
                    value={reasoning}
                    onChange={e => setReasoning(e.target.value)}
                    placeholder="Describe your premium prediction..."
                    className="w-full h-32 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50 resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#1f1f1f] bg-black/50 flex gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#111] border border-[#1f1f1f] text-white">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={reasoning.trim().length === 0}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all',
                    reasoning.trim().length > 0
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:shadow-lg'
                      : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                  Post for ${price}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
