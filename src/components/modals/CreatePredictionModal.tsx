import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Send, Search, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectedGame {
  id: string;
  home: string;
  away: string;
  odds: string;
  date: string;
  prediction: string;
  league?: string;
  matchTime?: string;
}

interface CreatePredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PredictionData) => void;
}

export interface PredictionData {
  matches: SelectedGame[];
  games: SelectedGame[];
  reasoning: string;
  totalOdds: string;
  entryFee: 'free' | 'premium';
  premiumPrice?: number;
}

const PREDICTIONS = ['1', 'X', '2', '1X', 'X2', '12', 'GG', 'NG', 'Over 1.5', 'Over 2.5', 'Over 3.5', 'Under 1.5', 'Under 2.5', 'Under 3.5'];
const API_KEY = '71b6bd51ec2a77eee7d4a472b85436f0';

export function CreatePredictionModal({ isOpen, onClose, onSubmit }: CreatePredictionModalProps) {
  const [games, setGames] = useState<SelectedGame[]>([]);
  const [reasoning, setReasoning] = useState('');
  const [entryFee, setEntryFee] = useState<'free' | 'premium'>('free');
  const [premiumPrice, setPremiumPrice] = useState(2.99);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGameList, setShowGameList] = useState(false);
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualHome, setManualHome] = useState('');
  const [manualAway, setManualAway] = useState('');
  const [manualOdds, setManualOdds] = useState('');
  const [manualPrediction, setManualPrediction] = useState('1');
  const [manualDate, setManualDate] = useState('');

  // Load today and tomorrow fixtures from API-Football
  useEffect(() => {
    if (!isOpen) return;
    setLoadingGames(true);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    Promise.all([
      fetch(`https://v3.football.api-sports.io/fixtures?date=${today}&status=NS`, {
        headers: { 'x-apisports-key': API_KEY }
      }).then(r => r.json()).catch(() => ({ response: [] })),
      fetch(`https://v3.football.api-sports.io/fixtures?date=${tomorrow}&status=NS`, {
        headers: { 'x-apisports-key': API_KEY }
      }).then(r => r.json()).catch(() => ({ response: [] })),
    ]).then(([todayData, tomorrowData]) => {
      const fixtures = [...(todayData.response || []), ...(tomorrowData.response || [])];
      setAvailableGames(fixtures.map((f: any) => ({
        id: String(f.fixture?.id),
        home: f.teams?.home?.name || '',
        away: f.teams?.away?.name || '',
        odds: '',
        date: f.fixture?.date?.split('T')[0] || today,
        matchTime: f.fixture?.date ? new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        league: f.league?.name || '',
        prediction: '1',
      })));
      setLoadingGames(false);
    });
  }, [isOpen]);

  const filteredGames = availableGames.filter(game =>
    `${game.home} ${game.away} ${game.league}`.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  const addGame = (game: any) => {
    if (!games.find(g => g.id === game.id)) {
      setGames([...games, { ...game, prediction: '1', odds: game.odds || '' }]);
      setSearchQuery('');
      setShowGameList(false);
    }
  };

  const addManualGame = () => {
    if (!manualHome.trim() || !manualAway.trim()) { alert('Enter home and away team'); return; }
    setGames([...games, {
      id: `manual_${Date.now()}`,
      home: manualHome.trim(),
      away: manualAway.trim(),
      odds: manualOdds || '',
      date: manualDate || new Date().toISOString().split('T')[0],
      prediction: manualPrediction,
      matchTime: '',
      league: '',
    }]);
    setManualHome('');
    setManualAway('');
    setManualOdds('');
    setManualPrediction('1');
    setManualDate('');
  };

  const removeGame = (id: string) => setGames(games.filter(g => g.id !== id));

  const updateGamePrediction = (id: string, prediction: string) => {
    setGames(games.map(g => g.id === id ? { ...g, prediction } : g));
  };

  const updateGameOdds = (id: string, odds: string) => {
    setGames(games.map(g => g.id === id ? { ...g, odds } : g));
  };

  const calculateTotalOdds = () => {
    const validOdds = games.filter(g => g.odds && parseFloat(g.odds) > 0);
    if (!validOdds.length) return '0';
    return validOdds.reduce((acc, game) => acc * parseFloat(game.odds), 1).toFixed(2);
  };

  const handleSubmit = () => {
    if (games.length === 0) { alert('Please add at least one game'); return; }
    if (!reasoning.trim()) { alert('Please add your reasoning'); return; }

    const matches = games.map(g => ({
      home: g.home,
      away: g.away,
      odds: g.odds || '',
      prediction: g.prediction || '1',
      status: 'pending',
      matchTime: g.matchTime || '',
      league: g.league || '',
      date: g.date || '',
    }));

    onSubmit({
      matches,
      games,
      reasoning,
      totalOdds: calculateTotalOdds(),
      entryFee,
      premiumPrice: entryFee === 'premium' ? premiumPrice : undefined,
    });

    setGames([]);
    setReasoning('');
    setEntryFee('free');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <div className="w-full max-w-2xl max-h-[90vh] bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-black/50">
                <div>
                  <h2 className="text-xl font-black text-white">Create Prediction</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Select games and add your prediction</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

                {/* Mode toggle */}
                <div className="flex gap-2">
                  <button onClick={() => setManualMode(false)}
                    className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition-all',
                      !manualMode ? 'bg-[#ef4444] text-white' : 'bg-[#111] border border-[#1f1f1f] text-[#71767b]')}>
                    🔍 Search Fixtures
                  </button>
                  <button onClick={() => setManualMode(true)}
                    className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition-all',
                      manualMode ? 'bg-[#ef4444] text-white' : 'bg-[#111] border border-[#1f1f1f] text-[#71767b]')}>
                    ✍️ Add Manually
                  </button>
                </div>

                {/* Search fixtures */}
                {!manualMode && (
                  <div>
                    <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">
                      Today & Tomorrow's Fixtures
                      {loadingGames && <Loader2 className="w-3 h-3 inline ml-2 animate-spin" />}
                    </label>
                    <div className="relative">
                      <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 focus-within:border-[#ef4444]/50 transition-all">
                        <Search className="w-4 h-4 text-[#71767b] shrink-0" />
                        <input type="text" value={searchQuery}
                          onChange={e => { setSearchQuery(e.target.value); setShowGameList(true); }}
                          onFocus={() => setShowGameList(true)}
                          placeholder="Search by team or league..."
                          className="flex-1 bg-transparent text-white placeholder:text-[#71767b] outline-none text-sm" />
                      </div>
                      <AnimatePresence>
                        {showGameList && filteredGames.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-[#1f1f1f] rounded-xl shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
                            {filteredGames.map(game => (
                              <button key={game.id} onClick={() => addGame(game)}
                                className="w-full px-3 py-2.5 text-left hover:bg-white/5 border-b border-[#1f1f1f] last:border-0 transition-colors">
                                <p className="text-sm text-white font-semibold">{game.home} vs {game.away}</p>
                                <p className="text-xs text-[#71767b]">{game.league} · {game.date} {game.matchTime}</p>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {!loadingGames && availableGames.length === 0 && (
                      <p className="text-xs text-[#71767b] mt-1">No fixtures loaded. Try adding manually.</p>
                    )}
                  </div>
                )}

                {/* Manual add */}
                {manualMode && (
                  <div className="space-y-3 bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={manualHome} onChange={e => setManualHome(e.target.value)}
                        placeholder="Home team" className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50" />
                      <input value={manualAway} onChange={e => setManualAway(e.target.value)}
                        placeholder="Away team" className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={manualOdds} onChange={e => setManualOdds(e.target.value)}
                        placeholder="Odds (e.g 1.85)" type="number" step="0.01"
                        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50" />
                      <input value={manualDate} onChange={e => setManualDate(e.target.value)}
                        type="date" className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ef4444]/50" />
                    </div>
                    <div>
                      <p className="text-xs text-[#71767b] mb-1">Prediction</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PREDICTIONS.map(p => (
                          <button key={p} onClick={() => setManualPrediction(p)}
                            className={cn('px-2.5 py-1 rounded-full text-xs font-bold transition-all',
                              manualPrediction === p ? 'bg-[#ef4444] text-white' : 'bg-[#0a0a0a] border border-[#1f1f1f] text-[#71767b]')}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={addManualGame}
                      className="w-full py-2 bg-[#ef4444]/20 border border-[#ef4444]/30 rounded-xl text-sm font-bold text-[#ef4444] hover:bg-[#ef4444]/30 transition-all">
                      + Add Game
                    </button>
                  </div>
                )}

                {/* Selected Games */}
                {games.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#71767b] uppercase">Selected ({games.length})</p>
                    {games.map((game, idx) => (
                      <div key={game.id} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white font-bold">{idx + 1}. {game.home} vs {game.away}</p>
                            <p className="text-xs text-[#71767b]">{game.league} · {game.date} {game.matchTime}</p>
                          </div>
                          <button onClick={() => removeGame(game.id)} className="p-1.5 rounded-lg bg-red-500/10 text-[#ef4444]">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input value={game.odds} onChange={e => updateGameOdds(game.id, e.target.value)}
                            placeholder="Odds" type="number" step="0.01"
                            className="w-20 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-[#ef4444]/50" />
                          <div className="flex flex-wrap gap-1.5 flex-1">
                            {PREDICTIONS.map(p => (
                              <button key={p} onClick={() => updateGamePrediction(game.id, p)}
                                className={cn('px-2 py-0.5 rounded-full text-xs font-bold transition-all',
                                  game.prediction === p ? 'bg-[#ef4444] text-white' : 'bg-[#0a0a0a] border border-[#1f1f1f] text-[#71767b]')}>
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total Odds */}
                {games.length > 1 && parseFloat(calculateTotalOdds()) > 0 && (
                  <div className="bg-gradient-to-r from-[#ef4444]/10 to-[#dc2626]/10 border border-[#ef4444]/20 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Total Odds</span>
                    <span className="text-lg font-black text-[#ef4444]">{calculateTotalOdds()}</span>
                  </div>
                )}

                {/* Reasoning */}
                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Your Analysis</label>
                  <textarea value={reasoning} onChange={e => setReasoning(e.target.value)}
                    placeholder="Why do you think this will hit? Share your analysis..."
                    className="w-full h-24 bg-[#111] border border-[#1f1f1f] rounded-xl px-3 py-2 text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50 resize-none text-sm" />
                </div>

                {/* Entry Type */}
                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Visibility</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['free', 'premium'] as const).map(type => (
                      <button key={type} onClick={() => setEntryFee(type)}
                        className={cn('px-4 py-3 rounded-xl border transition-all font-bold text-sm',
                          entryFee === type ? 'bg-[#ef4444] border-[#ef4444] text-white' : 'bg-[#111] border-[#1f1f1f] text-[#71767b]')}>
                        {type === 'free' ? '📌 Free Public' : '💎 Premium'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#1f1f1f] bg-black/50 flex items-center gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[#111] border border-[#1f1f1f] text-white text-sm">Cancel</button>
                <button onClick={handleSubmit} disabled={games.length === 0 || !reasoning.trim()}
                  className={cn('flex-1 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm',
                    games.length > 0 && reasoning.trim()
                      ? 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white'
                      : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] cursor-not-allowed')}>
                  <Send className="w-4 h-4" />Post Prediction
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
