import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MatchAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const SAMPLE_MATCHES = [
  { id: '1', name: 'Manchester United vs Liverpool' },
  { id: '2', name: 'Real Madrid vs Barcelona' },
  { id: '3', name: 'Bayern Munich vs Dortmund' },
];

export function MatchAnalysisModal({ isOpen, onClose, onSubmit }: MatchAnalysisModalProps) {
  const [selectedMatch, setSelectedMatch] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [form, setForm] = useState('Strong');
  const [injuries, setInjuries] = useState('');
  const [odds, setOdds] = useState('');

  const handleSubmit = () => {
    if (!selectedMatch || !analysis.trim()) {
      alert('Please select a match and add analysis');
      return;
    }
    onSubmit({ selectedMatch, analysis, form, injuries, odds });
    setSelectedMatch('');
    setAnalysis('');
    setForm('Strong');
    setInjuries('');
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
            <div className="w-full max-w-2xl max-h-[90vh] bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-black/50">
                <div>
                  <h2 className="text-xl font-black text-white">📊 Match Analysis</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Deep dive breakdown of a match</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Select Match</label>
                  <select
                    value={selectedMatch}
                    onChange={e => setSelectedMatch(e.target.value)}
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white outline-none focus:border-[#ef4444]/50"
                  >
                    <option value="">Choose a match...</option>
                    {SAMPLE_MATCHES.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Current Form</label>
                    <select
                      value={form}
                      onChange={e => setForm(e.target.value)}
                      className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option>Strong</option>
                      <option>Medium</option>
                      <option>Weak</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Odds</label>
                    <input
                      type="text"
                      value={odds}
                      onChange={e => setOdds(e.target.value)}
                      placeholder="1.50"
                      className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#ef4444]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Key Injuries</label>
                  <input
                    type="text"
                    value={injuries}
                    onChange={e => setInjuries(e.target.value)}
                    placeholder="List any key injuries..."
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#ef4444]/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Full Analysis</label>
                  <textarea
                    value={analysis}
                    onChange={e => setAnalysis(e.target.value)}
                    placeholder="Detailed match breakdown..."
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
                  disabled={!selectedMatch || !analysis.trim()}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all',
                    selectedMatch && analysis.trim()
                      ? 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white hover:shadow-lg'
                      : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                  Post Analysis
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
