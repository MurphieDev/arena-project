import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MultiBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const AVAILABLE_GAMES = [
  { id: '1', home: 'Manchester United', away: 'Liverpool', odds: '1.85', date: '2026-06-17' },
  { id: '2', home: 'Real Madrid', away: 'Barcelona', odds: '1.95', date: '2026-06-17' },
  { id: '3', home: 'Bayern Munich', away: 'Dortmund', odds: '1.72', date: '2026-06-18' },
];

export function MultiBetModal({ isOpen, onClose, onSubmit }: MultiBetModalProps) {
  const [games, setGames] = useState<any[]>([]);
  const [reasoning, setReasoning] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGameList, setShowGameList] = useState(false);

  const addGame = (game: any) => {
    if (!games.find(g => g.id === game.id)) {
      setGames([...games, game]);
      setSearchQuery('');
      setShowGameList(false);
    }
  };

  const removeGame = (id: string) => {
    setGames(games.filter(g => g.id !== id));
  };

  const totalOdds = games.reduce((acc, game) => acc * parseFloat(game.odds), 1).toFixed(2);
  const potentialReturn = (parseFloat(totalOdds) * 100).toFixed(0);

  const handleSubmit = () => {
    if (games.length < 2 || reasoning.trim().length === 0) {
      alert('Multi-Bet requires at least 2 games and reasoning');
      return;
    }
    onSubmit({ games, reasoning, totalOdds, potentialReturn });
    setGames([]);
    setReasoning('');
    onClose();
  };

  const filteredGames = AVAILABLE_GAMES.filter(g =>
    `${g.home} ${g.away}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  <h2 className="text-xl font-black text-white">🎯 Multi-Bet Parlay</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Combine multiple games for higher odds</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Add Games</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setShowGameList(true);
                    }}
                    placeholder="Search games..."
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white outline-none focus:border-[#ef4444]/50"
                  />
                  <AnimatePresence>
                    {showGameList && filteredGames.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute mt-1 bg-[#111] border border-[#1f1f1f] rounded-lg shadow-lg overflow-hidden z-10"
                      >
                        {filteredGames.map(game => (
                          <button
                            key={game.id}
                            onClick={() => addGame(game)}
                            className="w-full px-3 py-2.5 text-left hover:bg-white/5 border-b border-[#1f1f1f] last:border-0 flex justify-between"
                          >
                            <div>
                              <p className="text-sm text-white font-semibold">{game.home} vs {game.away}</p>
                            </div>
                            <span className="text-sm font-bold text-[#ef4444]">{game.odds}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {games.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-[#71767b] uppercase">Bundle ({games.length} games)</p>
                      {games.map((game, idx) => (
                        <div key={game.id} className="bg-[#111] border border-[#1f1f1f] rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <p className="text-sm text-white font-semibold">{idx + 1}. {game.home} vs {game.away}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-green-400">{game.odds}</span>
                            <button
                              onClick={() => removeGame(game.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[#ef4444]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gradient-to-r from-[#ef4444]/10 to-[#dc2626]/10 border border-[#ef4444]/20 rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-white">Total Odds</span>
                        <span className="text-lg font-black text-[#ef4444]">{totalOdds}</span>
                      </div>
                      <p className="text-xs text-[#71767b] mt-1">Potential return on $100: ${potentialReturn}</p>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Analysis</label>
                  <textarea
                    value={reasoning}
                    onChange={e => setReasoning(e.target.value)}
                    placeholder="Why will all these hit together?"
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
                  disabled={games.length < 2 || reasoning.trim().length === 0}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all',
                    games.length >= 2 && reasoning.trim().length > 0
                      ? 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white hover:shadow-lg'
                      : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                  Post Multi-Bet
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
