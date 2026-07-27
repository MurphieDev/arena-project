import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Send } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectedGame {
  id: string;
  home: string;
  away: string;
  odds: string;
  date: string;
}

interface CreatePredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PredictionData) => void;
}

export interface PredictionData {
  games: SelectedGame[];
  reasoning: string;
  entryFee: 'free' | 'premium';
  premiumPrice?: number;
}

// Mock games data - replace with real API data
const AVAILABLE_GAMES = [
  { id: '1', home: 'Manchester United', away: 'Liverpool', odds: '1.85', date: '2026-06-17', league: 'Premier League' },
  { id: '2', home: 'Real Madrid', away: 'Barcelona', odds: '1.95', date: '2026-06-17', league: 'La Liga' },
  { id: '3', home: 'Bayern Munich', away: 'Borussia Dortmund', odds: '1.72', date: '2026-06-18', league: 'Bundesliga' },
  { id: '4', home: 'PSG', away: 'Marseille', odds: '1.50', date: '2026-06-18', league: 'Ligue 1' },
  { id: '5', home: 'Juventus', away: 'Milan', odds: '1.80', date: '2026-06-19', league: 'Serie A' },
];

export function CreatePredictionModal({ isOpen, onClose, onSubmit }: CreatePredictionModalProps) {
  const [games, setGames] = useState<SelectedGame[]>([]);
  const [reasoning, setReasoning] = useState('');
  const [entryFee, setEntryFee] = useState<'free' | 'premium'>('free');
  const [premiumPrice, setPremiumPrice] = useState(2.99);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGameList, setShowGameList] = useState(false);

  const filteredGames = AVAILABLE_GAMES.filter(game =>
    `${game.home} ${game.away}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addGame = (game: typeof AVAILABLE_GAMES[0]) => {
    if (!games.find(g => g.id === game.id)) {
      setGames([...games, {
        id: game.id,
        home: game.home,
        away: game.away,
        odds: game.odds,
        date: game.date,
      }]);
      setSearchQuery('');
      setShowGameList(false);
    }
  };

  const removeGame = (id: string) => {
    setGames(games.filter(g => g.id !== id));
  };

  const calculateTotalOdds = () => {
    return games.reduce((acc, game) => acc * parseFloat(game.odds), 1).toFixed(2);
  };

  const handleSubmit = () => {
    if (games.length === 0 || reasoning.trim().length === 0) {
      alert('Please select at least one game and add reasoning');
      return;
    }

    onSubmit({
      games,
      reasoning,
      entryFee,
      premiumPrice: entryFee === 'premium' ? premiumPrice : undefined,
    });

    // Reset form
    setGames([]);
    setReasoning('');
    setEntryFee('free');
    setPremiumPrice(2.99);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full max-w-2xl max-h-[90vh] bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-black/50 backdrop-blur">
                <div>
                  <h2 className="text-xl font-black text-white">Create Prediction</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Select games and add your reasoning</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Game Selector */}
                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Select Games</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setShowGameList(true);
                      }}
                      onFocus={() => setShowGameList(true)}
                      placeholder="Search games..."
                      className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50 transition-all"
                    />

                    {/* Dropdown */}
                    <AnimatePresence>
                      {showGameList && filteredGames.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-[#1f1f1f] rounded-lg shadow-lg overflow-hidden z-10"
                        >
                          {filteredGames.map(game => (
                            <button
                              key={game.id}
                              onClick={() => addGame(game)}
                              className="w-full px-3 py-2.5 text-left hover:bg-white/5 border-b border-[#1f1f1f] last:border-0 transition-colors flex items-center justify-between group"
                            >
                              <div className="flex-1">
                                <p className="text-sm text-white font-semibold">
                                  {game.home} vs {game.away}
                                </p>
                                <p className="text-xs text-[#71767b]">{game.league} • {game.date}</p>
                              </div>
                              <span className="text-sm font-bold text-[#ef4444] group-hover:text-green-400 transition-colors">
                                {game.odds}
                              </span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Selected Games */}
                {games.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#71767b] uppercase">Selected Games ({games.length})</p>
                    {games.map((game, idx) => (
                      <motion.div
                        key={game.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-[#111] border border-[#1f1f1f] rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-white font-semibold">
                            {idx + 1}. {game.home} vs {game.away}
                          </p>
                          <p className="text-xs text-[#71767b]">{game.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-green-400">{game.odds}</span>
                          <button
                            onClick={() => removeGame(game.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors text-[#ef4444]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Total Odds */}
                {games.length > 1 && (
                  <div className="bg-gradient-to-r from-[#ef4444]/10 to-[#dc2626]/10 border border-[#ef4444]/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Total Odds (Parlay)</span>
                      <span className="text-lg font-black text-[#ef4444]">{calculateTotalOdds()}</span>
                    </div>
                    <p className="text-xs text-[#71767b] mt-1">Win $270 if you bet $100</p>
                  </div>
                )}

                {/* Reasoning */}
                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Your Reasoning</label>
                  <textarea
                    value={reasoning}
                    onChange={e => setReasoning(e.target.value)}
                    placeholder="Why do you think this will hit? Share your analysis..."
                    className="w-full h-28 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50 transition-all resize-none"
                  />
                  <p className="text-[10px] text-[#71767b] mt-1">{reasoning.length}/500 characters</p>
                </div>

                {/* Entry Fee */}
                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Entry Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setEntryFee('free')}
                      className={cn(
                        'px-4 py-3 rounded-lg border transition-all font-semibold text-sm',
                        entryFee === 'free'
                          ? 'bg-[#ef4444] border-[#ef4444] text-white'
                          : 'bg-[#111] border-[#1f1f1f] text-[#71767b] hover:border-[#ef4444]/50'
                      )}
                    >
                      📌 Free Public
                    </button>
                    <button
                      onClick={() => setEntryFee('premium')}
                      className={cn(
                        'px-4 py-3 rounded-lg border transition-all font-semibold text-sm',
                        entryFee === 'premium'
                          ? 'bg-[#ef4444] border-[#ef4444] text-white'
                          : 'bg-[#111] border-[#1f1f1f] text-[#71767b] hover:border-[#ef4444]/50'
                      )}
                    >
                      💎 Premium
                    </button>
                  </div>
                </div>

                {/* Premium Price */}
                {entryFee === 'premium' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Price (USD)</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPremiumPrice(Math.max(0.99, premiumPrice - 0.99))}
                        className="px-3 py-2 bg-[#111] border border-[#1f1f1f] rounded-lg hover:border-[#ef4444]/50 transition-colors text-white"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={premiumPrice}
                        onChange={e => setPremiumPrice(parseFloat(e.target.value) || 0.99)}
                        min="0.99"
                        step="0.99"
                        className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white outline-none focus:border-[#ef4444]/50 transition-all text-center"
                      />
                      <button
                        onClick={() => setPremiumPrice(premiumPrice + 0.99)}
                        className="px-3 py-2 bg-[#111] border border-[#1f1f1f] rounded-lg hover:border-[#ef4444]/50 transition-colors text-white"
                      >
                        +
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#1f1f1f] bg-black/50 backdrop-blur flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-[#111] border border-[#1f1f1f] text-white hover:border-[#71767b] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={games.length === 0 || reasoning.trim().length === 0}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all',
                    games.length > 0 && reasoning.trim().length > 0
                      ? 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white hover:shadow-lg hover:shadow-red-500/50'
                      : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                  Post Prediction
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
