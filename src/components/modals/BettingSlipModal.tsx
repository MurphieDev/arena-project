import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Upload, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BettingSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const PREDICTIONS = ['1', 'X', '2', '1X', 'X2', '12', 'GG', 'NG', 'Over 1.5', 'Over 2.5', 'Over 3.5', 'Under 2.5'];

function normalizePrediction(pred: string): string {
  const p = pred.toLowerCase().trim();
  if (p === 'home') return '1';
  if (p === 'away') return '2';
  if (p === 'draw') return 'X';
  if (p === 'home/draw' || p === '1x') return '1X';
  if (p === 'draw/away' || p === 'x2') return 'X2';
  if (p === 'home/away' || p === '12') return '12';
  if (p === 'both teams to score' || p === 'yes' || p === 'gg') return 'GG';
  if (p === 'no' || p === 'ng') return 'NG';
  const over = p.match(/over\s*([\d.]+)/);
  if (over) return 'Over ' + over[1];
  const under = p.match(/under\s*([\d.]+)/);
  if (under) return 'Under ' + under[1];
  return pred;
}

function parseOCRText(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const matches: any[] = [];

  // Sportybet pattern: "Home/Away/Draw  odds" → "Team A vs Team B" → "1X2"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match "Home    1.45" or "Away    2.20" or "Over 2.5   1.30"
    const predOddsMatch = line.match(/^(home|away|draw|over\s*[\d.]+|under\s*[\d.]+|both teams to score|yes|no|gg|ng)\s+([\d.]+)$/i);
    if (predOddsMatch) {
      const pred = normalizePrediction(predOddsMatch[1]);
      const odds = predOddsMatch[2];
      // Next line should be "Team A vs Team B"
      const nextLine = lines[i + 1] || '';
      const vsMatch = nextLine.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
      if (vsMatch) {
        matches.push({
          home: vsMatch[1].trim(),
          away: vsMatch[2].replace(/\s+[\d.]+.*/, '').trim(),
          odds,
          prediction: pred,
          status: 'pending',
        });
        i += 2;
        continue;
      }
    }

    // Direct "Team A vs Team B" line
    const vsMatch = line.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s+[\d.]+)?$/i);
    if (vsMatch) {
      const home = vsMatch[1].trim();
      const away = vsMatch[2].replace(/\s+[\d.]+.*/, '').trim();
      if (home.length < 2 || away.length < 2) continue;
      if (/^(over|under|draw|home|away|yes|no)$/i.test(home)) continue;

      // Look back up to 3 lines for prediction+odds
      let pred = '1';
      let odds = '';
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const prev = lines[j];
        const m = prev.match(/^(home|away|draw|over\s*[\d.]+|under\s*[\d.]+|both teams|yes|no|gg|ng)\s+([\d.]+)$/i);
        if (m) { pred = normalizePrediction(m[1]); odds = m[2]; break; }
        // Just odds
        const justOdds = prev.match(/^([1-9]\.[\d]{2,3})$/);
        if (justOdds) odds = justOdds[1];
      }

      if (!matches.find(m => m.home === home && m.away === away)) {
        matches.push({ home, away, odds, prediction: pred, status: 'pending' });
      }
    }
  }

  // Fallback: any vs pattern
  if (matches.length === 0) {
    const vsPattern = /([A-Za-z][\w\s.\-&']{1,35})\s+vs\.?\s+([A-Za-z][\w\s.\-&']{1,35})/gi;
    let m;
    while ((m = vsPattern.exec(text)) !== null) {
      const home = m[1].trim();
      const away = m[2].replace(/\s+[\d.]+.*/, '').trim();
      if (home.length > 2 && away.length > 2) {
        const ctx = text.slice(Math.max(0, m.index - 60), m.index + 80);
        const predM = ctx.match(/\b(home|away|draw|over\s*[\d.]+|under\s*[\d.]+)\b/i);
        const oddsM = ctx.match(/\b([1-9]\.[\d]{2})\b/);
        matches.push({
          home, away,
          odds: oddsM ? oddsM[1] : '',
          prediction: predM ? normalizePrediction(predM[1]) : '1',
          status: 'pending',
        });
      }
    }
  }

  const codeMatch = text.match(/(?:booking code|booking|code|ref)[:\s]*([A-Z0-9]{4,15})/i);
  const oddsMatch = text.match(/(?:total odds|odds)[:\s]*([\d.]+)/i);

  return {
    matches,
    bookingCode: codeMatch?.[1] || '',
    totalOdds: oddsMatch?.[1] || '',
  };
}

export function BettingSlipModal({ isOpen, onClose, onSubmit }: BettingSlipModalProps) {
  const [imageBase64, setImageBase64] = useState('');
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
      setImageBase64(base64);
      setLoading(true);
      try {
        const res = await fetch('/.netlify/functions/ocr-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const data = await res.json();
        const text = data?.ParsedResults?.[0]?.ParsedText || '';
        const parsed = parseOCRText(text);

        // Try to enrich with fixtureIds from API-Football
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const enriched = await Promise.all(parsed.matches.map(async (m: any) => {
          if (!m.home || !m.away) return m;
          try {
            for (const date of [today, tomorrow, yesterday]) {
              const r = await fetch(
                `https://v3.football.api-sports.io/fixtures?date=${date}`,
                { headers: { 'x-apisports-key': '71b6bd51ec2a77eee7d4a472b85436f0' } }
              );
              const d = await r.json();
              const fixture = (d.response || []).find((f: any) => {
                const fh = (f.teams?.home?.name || '').toLowerCase();
                const fa = (f.teams?.away?.name || '').toLowerCase();
                const mh = m.home.toLowerCase();
                const ma = m.away.toLowerCase();
                return (fh.includes(mh) || mh.includes(fh)) && (fa.includes(ma) || ma.includes(fa));
              });
              if (fixture) {
                const fixtureDate = fixture.fixture.date ? new Date(fixture.fixture.date) : null;
                const matchTime = fixtureDate 
                  ? fixtureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  : '';
                const matchDateStr = fixtureDate
                  ? fixtureDate.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
                  : '';
                return {
                  ...m,
                  fixtureId: fixture.fixture.id,
                  leagueId: fixture.league.id,
                  league: fixture.league.name,
                  home: fixture.teams.home.name,
                  away: fixture.teams.away.name,
                  matchTime,
                  matchDate: matchDateStr,
                  status: fixture.fixture.status?.short || 'NS',
                };
              }
            }
          } catch {}
          return m;
        }));

        setOcrResult({ ...parsed, matches: enriched });
      } catch (e) {
        console.error('OCR error:', e);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!imageBase64) { alert('Please upload a betting slip image'); return; }
    const matches = (ocrResult?.matches || []).map((m: any) => ({
      home: m.home || '',
      away: m.away || '',
      odds: m.odds || '',
      prediction: m.prediction || '1',
      fixtureId: m.fixtureId || null,
      leagueId: m.leagueId || null,
      league: m.league || '',
      matchTime: m.matchTime || '',
      status: 'pending',
    }));
    onSubmit({
      imageUrl: imageBase64,
      caption,
      matches,
      bookingCode: ocrResult?.bookingCode || '',
      totalOdds: ocrResult?.totalOdds || '',
      platform: 'sportybet',
    });
    setImageBase64('');
    setPreview('');
    setCaption('');
    setOcrResult(null);
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
            <div className="w-full max-w-xl max-h-[90vh] bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-black/50">
                <div>
                  <h2 className="text-xl font-black text-white">🎫 Betting Slip</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Upload your slip — OCR extracts matches automatically</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {!preview ? (
                  <label className="block">
                    <div className="border-2 border-dashed border-[#1f1f1f] rounded-xl p-8 text-center cursor-pointer hover:border-[#ef4444]/50 transition-colors">
                      <Upload className="w-8 h-8 text-[#71767b] mx-auto mb-2" />
                      <p className="text-sm text-white font-semibold">Tap to upload betting slip</p>
                      <p className="text-xs text-[#71767b] mt-1">Works with Sportybet, Betking, Bet9ja, 1xBet</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <img src={preview} alt="Betslip" className="w-full max-h-64 object-contain rounded-xl bg-[#111]" />
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-[#71767b] hover:text-white cursor-pointer font-semibold">
                        Change image
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                      {loading && (
                        <span className="flex items-center gap-1 text-xs text-[#ef4444]">
                          <Loader2 className="w-3 h-3 animate-spin" />Scanning...
                        </span>
                      )}
                    </div>

                    {ocrResult && (
                      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-white">Extracted Matches</p>
                          {ocrResult.bookingCode && (
                            <span className="text-xs text-[#71767b]">Code: <span className="text-white font-bold">{ocrResult.bookingCode}</span></span>
                          )}
                        </div>

                        {ocrResult.matches.length === 0 ? (
                          <p className="text-xs text-yellow-400">No matches detected. Try a clearer image.</p>
                        ) : ocrResult.matches.map((m: any, i: number) => (
                          <div key={i} className="bg-[#0a0a0a] rounded-xl p-2.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-white font-semibold">{m.home} vs {m.away}</p>
                              {m.odds && <span className="text-xs text-[#71767b]">{m.odds}</span>}
                            </div>
                            {m.league && <p className="text-[10px] text-[#71767b]">{m.league} {m.matchTime ? '· ' + m.matchTime : ''}</p>}
                            <div>
                              <p className="text-[10px] text-[#71767b] mb-1">Prediction (tap to change):</p>
                              <div className="flex flex-wrap gap-1">
                                {PREDICTIONS.map(pred => (
                                  <button key={pred}
                                    onClick={() => {
                                      const updated = [...ocrResult.matches];
                                      updated[i] = { ...updated[i], prediction: pred };
                                      setOcrResult({ ...ocrResult, matches: updated });
                                    }}
                                    className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold transition-all',
                                      m.prediction === pred
                                        ? 'bg-[#ef4444] text-white'
                                        : 'bg-[#1f1f1f] text-[#71767b] hover:text-white'
                                    )}>
                                    {pred}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}

                        {ocrResult.totalOdds && (
                          <div className="flex items-center justify-between pt-1 border-t border-[#1f1f1f]">
                            <span className="text-xs text-[#71767b]">Total Odds</span>
                            <span className="text-sm font-black text-[#ef4444]">{ocrResult.totalOdds}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Caption (optional)</label>
                  <textarea value={caption} onChange={e => setCaption(e.target.value)}
                    placeholder="Add your analysis or context..."
                    className="w-full h-20 bg-[#111] border border-[#1f1f1f] rounded-xl px-3 py-2 text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50 resize-none text-sm" />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#1f1f1f] bg-black/50 flex gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[#111] border border-[#1f1f1f] text-white text-sm font-semibold">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={!imageBase64}
                  className={cn('flex-1 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all',
                    imageBase64
                      ? 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white hover:opacity-90'
                      : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] cursor-not-allowed'
                  )}>
                  <Send className="w-4 h-4" />Post Slip
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
