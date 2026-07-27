import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PromotePredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const PROMOTION_TIERS = [
  { id: 'standard', name: 'Standard', days: 1, price: 0.99, description: 'Boost for 24 hours' },
  { id: 'featured', name: 'Featured', days: 3, price: 2.99, description: 'Prominent placement for 3 days' },
  { id: 'premium', name: 'Premium', days: 7, price: 4.99, description: 'Top featured for a full week' },
];

export function PromotePredictionModal({ isOpen, onClose, onSubmit }: PromotePredictionModalProps) {
  const [selectedTier, setSelectedTier] = useState('standard');

  const handleSubmit = () => {
    const tier = PROMOTION_TIERS.find(t => t.id === selectedTier);
    if (!tier) return;
    onSubmit({ tier: selectedTier, price: tier.price, days: tier.days });
    setSelectedTier('standard');
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
                  <h2 className="text-xl font-black text-white">🚀 Promote Prediction</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Boost visibility in the feed</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div className="grid gap-3">
                  {PROMOTION_TIERS.map(tier => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.id)}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all text-left',
                        selectedTier === tier.id
                          ? 'border-[#ef4444] bg-[#ef4444]/10'
                          : 'border-[#1f1f1f] bg-[#111] hover:border-[#1f1f1f]/50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-white">{tier.name}</p>
                          <p className="text-xs text-[#71767b]">{tier.description}</p>
                          <p className="text-xs text-green-400 font-semibold mt-1">📅 {tier.days} day{tier.days > 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-[#ef4444] text-lg">${tier.price}</p>
                          {tier.id === 'featured' && (
                            <p className="text-[10px] text-yellow-400 font-bold">POPULAR</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  {PROMOTION_TIERS.find(t => t.id === selectedTier) && (
                    <p className="text-xs text-blue-400 font-semibold">
                      ✓ Your prediction will get {PROMOTION_TIERS.find(t => t.id === selectedTier)?.days} day{PROMOTION_TIERS.find(t => t.id === selectedTier)?.days! > 1 ? 's' : ''} of extra visibility
                    </p>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#1f1f1f] bg-black/50 flex gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#111] border border-[#1f1f1f] text-white">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-lg"
                >
                  <Rocket className="w-4 h-4" />
                  Promote for ${PROMOTION_TIERS.find(t => t.id === selectedTier)?.price}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
