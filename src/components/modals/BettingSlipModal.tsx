import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Upload, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BettingSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function BettingSlipModal({ isOpen, onClose, onSubmit }: BettingSlipModalProps) {
  const [imageBase64, setImageBase64] = useState<string>('');
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
      // Auto-scan immediately on upload
      setLoading(true);
      try {
        const res = await fetch('/.netlify/functions/ocr-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const data = await res.json();
        const text = data?.ParsedResults?.[0]?.ParsedText || '';
        // Sportybet format parser (works for Betking, Bet9ja too)
        // Format: "Home/Away/Draw   odds" then "Team A vs Team B" then "1X2"
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        const matches: any[] = [];

        const normalizePrediction = (pred: string): string => {
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
        };

        // Strategy 1: Sportybet pattern
        // Look for: prediction line → "Team A vs Team B" line
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Check if this line is a prediction keyword (Home, Away, Draw, Over 2.5 etc)
          const predKeywords = /^(home|away|draw|over|under|both teams|yes|no|gg|ng|1x2|home\/draw|draw\/away|home\/away|\d+[+-]?\s*goals?)$/i;
          // Extract prediction and odds from line like "Home    1.45" or "Over 2.5    1.30"
          const predOddsMatch = line.match(/^(home|away|draw|over\s*[\d.]+|under\s*[\d.]+|both teams to score|yes|no|gg|ng|\d+\+?\s*goals?)\s+([\d.]+)$/i);
          
          if (predOddsMatch) {
            const pred = normalizePrediction(predOddsMatch[1]);
            const odds = predOddsMatch[2];
            // Next line should be "Team A vs Team B"
            const nextLine = lines[i + 1] || '';
            const vsMatch = nextLine.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
            if (vsMatch) {
              matches.push({
                home: vsMatch[1].trim(),
                away: vsMatch[2].trim(),
                odds,
                prediction: pred,
                status: 'pending',
              });
              i += 2; // Skip team line and market line
              continue;
            }
          }

          // Check if this line is "Team A vs Team B"
          const vsMatch = line.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
          if (vsMatch) {
            const home = vsMatch[1].trim();
            const away = vsMatch[2].trim();
            // Look back for prediction
            let pred = '1';
            let odds = '';
            for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
              const prevLine = lines[j];
              const predOddsBack = prevLine.match(/^(home|away|draw|over\s*[\d.]+|under\s*[\d.]+|both teams|yes|no|gg|ng)\s+([\d.]+)$/i);
              if (predOddsBack) {
                pred = normalizePrediction(predOddsBack[1]);
                odds = predOddsBack[2];
                break;
              }
              // Just odds on prev line
              const justOdds = prevLine.match(/^([\d]{1}\.[\d]+)$/);
              if (justOdds) odds = justOdds[1];
            }
            // Check if already added this match
            if (!matches.find(m => m.home === home && m.away === away)) {
              matches.push({ home, away, odds, prediction: pred, status: 'pending' });
            }
          }
        }

        // Strategy 2: Fallback - any "vs" pattern
        if (matches.length === 0) {
          const vsPattern = /([A-Za-z][\w\s.\-&']{1,35})\s+vs\.?\s+([A-Za-z][\w\s.\-&']{1,35})/gi;
          let m;
          while ((m = vsPattern.exec(text)) !== null) {
            const home = m[1].trim();
            const away = m[2].replace(/\s+[\d.]+.*/, '').trim();
            if (home.length > 2 && away.length > 2) {
              const context = text.slice(Math.max(0, m.index - 60), m.index + 60);
              const oddsNear = context.match(/([1-9]\.[\d]{2})/);
              const predNear = context.match(/\b(home|away|draw|over\s*[\d.]+|under\s*[\d.]+)\b/i);
              matches.push({
                home, away,
                odds: oddsNear ? oddsNear[1] : '',
                prediction: predNear ? normalizePrediction(predNear[1]) : '1',
                status: 'pending',
              });
            }
          }
        }

        const codeMatch = text.match(/(?:booking code|code|ref)[:\s]*([A-Z0-9]{4,15})/i);
        const oddsMatch = text.match(/(?:total odds|odds)[:\s]*([\d.]+)/i);s {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function BettingSlipModal({ isOpen, onClose, onSubmit }: BettingSlipModalProps) {
  const [imageBase64, setImageBase64] = useState<string>('');
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
      // Auto-scan immediately on upload
      setLoading(true);
      try {
        const res = await fetch('/.netlify/functions/ocr-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const data = await res.json();
        const text = data?.ParsedResults?.[0]?.ParsedText || '';
        // Universal OCR parser - handles any betting platform format
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        const matches: any[] = [];

        const extractPrediction = (ctx: string): string => {
          const t = ctx.toLowerCase();
          const over = t.match(/over\s*([\d.]+)/);
          if (over) return 'Over ' + over[1];
          const under = t.match(/under\s*([\d.]+)/);
          if (under) return 'Under ' + under[1];
          if (/both teams to score|btts|gg|both score/i.test(t)) return 'GG';
          if (/home win|home team win/i.test(t)) return '1';
          if (/away win|away team win/i.test(t)) return '2';
          if (/draw/i.test(t)) return 'X';
          if (/1x2.*home|^1$/m.test(t)) return '1';
          if (/1x2.*away|^2$/m.test(t)) return '2';
          if (/double chance.*1x|^1x$/im.test(t)) return '1X';
          if (/double chance.*x2|^x2$/im.test(t)) return 'X2';
          return '';
        };

        // Strategy 1: Find "Team A vs Team B" pattern (most common)
        const vsPattern = /([A-Za-z][\w\s\.\-&']{2,40})\s+(?:vs?\.?|@|-)\s+([A-Za-z][\w\s\.\-&']{2,40})/gi;
        let vsMatch;
        while ((vsMatch = vsPattern.exec(text)) !== null) {
          const home = vsMatch[1].trim();
          const away = vsMatch[2].trim().replace(/\s+[\d.]{3,}.*/, '');
          if (home.length < 2 || away.length < 2) continue;
          if (/^(over|under|draw|home|away|yes|no|gg)$/i.test(home)) continue;
          const contextStart = Math.max(0, vsMatch.index - 50);
          const context = text.slice(contextStart, vsMatch.index + vsMatch[0].length + 100);
          const oddsInContext = context.match(/\b([1-9]\.[\d]{2,3})\b/);
          matches.push({
            home,
            away,
            odds: oddsInContext ? oddsInContext[1] : '',
            prediction: extractPrediction(context) || '1',
            status: 'pending',
          });
        }

        // Strategy 2: If no vs found, look for team name pairs (Sportybet, Betking etc)
        if (matches.length === 0) {
          const isTeamName = (s: string) => 
            s.length >= 3 && s.length <= 45 && 
            /[a-zA-Z]{3,}/.test(s) && 
            !/^(over|under|draw|home|away|yes|no|full|time|half|score|match|result|booking|code|total|odds|date|sport|league|live|kick|off|period|quarter|set|game|bet|win|lose|void|cashout|selection|market|event|fixture|round|group|stage|final|semi)$/i.test(s);
          
          for (let i = 0; i < lines.length; i++) {
            if (!isTeamName(lines[i])) continue;
            // Look ahead for another team name within 3 lines
            for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
              if (!isTeamName(lines[j])) continue;
              const context = lines.slice(i, Math.min(i + 6, lines.length)).join(' ');
              const pred = extractPrediction(context);
              const oddsMatch2 = context.match(/\b([1-9]\.[\d]{2,3})\b/);
              if (pred) {
                matches.push({
                  home: lines[i],
                  away: lines[j],
                  odds: oddsMatch2 ? oddsMatch2[1] : '',
                  prediction: pred,
                  status: 'pending',
                });
                i = j;
                break;
              }
            }
          }
        }

        // Remove duplicates
        const uniqueMatches = matches.filter((m, idx, arr) => 
          arr.findIndex(x => x.home === m.home && x.away === m.away) === idx
        );
        uniqueMatches.forEach(m => matches.indexOf(m) === -1 || true);
        matches.splice(0, matches.length, ...uniqueMatches);

        const codeMatch = text.match(/(?:booking|code|ref|bet id|ticket|slip)[:\s#]*([A-Z0-9]{4,15})/i);
        const oddsMatch = text.match(/(?:total odds|cum|accumulator|potential|poss)[^\d]*([\d]+\.[\d]+)/i);
        // After extracting matches, try to find fixture IDs from API-Football
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        const enrichedMatches = await Promise.all(matches.map(async (m: any) => {
          if (!m.home || !m.away) return m;
          try {
            // Search fixtures for this match in recent dates
            for (const date of [today, tomorrow, yesterday]) {
              const res = await fetch(
                `https://v3.football.api-sports.io/fixtures?date=${date}`,
                { headers: { 'x-apisports-key': '71b6bd51ec2a77eee7d4a472b85436f0' } }
              );
              const data = await res.json();
              const fixtures = data.response || [];
              const match = fixtures.find((f: any) => {
                const fh = (f.teams?.home?.name || '').toLowerCase();
                const fa = (f.teams?.away?.name || '').toLowerCase();
                const mh = m.home.toLowerCase();
                const ma = m.away.toLowerCase();
                return (fh.includes(mh) || mh.includes(fh)) && (fa.includes(ma) || ma.includes(fa));
              });
              if (match) {
                return {
                  ...m,
                  fixtureId: match.fixture.id,
                  leagueId: match.league.id,
                  league: match.league.name,
                  matchTime: match.fixture.date ? new Date(match.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                  home: match.teams.home.name, // Use exact API name
                  away: match.teams.away.name,
                };
              }
            }
          } catch(e) {}
          return m;
        }));

        setOcrResult({
          matches: enrichedMatches,
          bookingCode: codeMatch?.[1] || '',
          totalOdds: oddsMatch?.[1] || '',
          rawText: text,
        });
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
    // Ensure all matches have predictions
    const matches = (ocrResult?.matches || []).map((m: any) => ({
      home: m.home || '',
      away: m.away || '',
      odds: m.odds || '',
      prediction: m.prediction || '1',
      status: 'pending',
    }));
    onSubmit({
      imageUrl: imageBase64,
      caption,
      matches,
      bookingCode: ocrResult?.bookingCode || '',
      totalOdds: ocrResult?.totalOdds || '',
      platform: 'betslip',
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
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-black/50">
                <div>
                  <h2 className="text-xl font-black text-white">🎫 Betting Slip</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Upload your slip — OCR will extract the matches</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {!preview ? (
                  <label className="block">
                    <div className="border-2 border-dashed border-[#1f1f1f] rounded-lg p-8 text-center cursor-pointer hover:border-[#ef4444]/50 transition-colors">
                      <Upload className="w-8 h-8 text-[#71767b] mx-auto mb-2" />
                      <p className="text-sm text-white font-semibold">Tap to upload betting slip</p>
                      <p className="text-xs text-[#71767b] mt-1">PNG, JPG up to 10MB</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden bg-[#111]">
                      <img src={preview} alt="Preview" className="w-full max-h-64 object-contain" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setPreview(''); setImageBase64(''); setOcrResult(null); }}
                        className="text-xs text-[#71767b] hover:text-white font-semibold">Change image</button>
                      {loading && <span className="flex items-center gap-1 text-xs text-[#ef4444]"><Loader2 className="w-3 h-3 animate-spin" />Scanning...</span>}
                    </div>
                    {ocrResult && (
                      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-3 space-y-2">
                        <p className="text-xs font-bold text-white">OCR Results:</p>
                        {ocrResult.bookingCode && <p className="text-xs text-[#71767b]">Code: <span className="text-white font-bold">{ocrResult.bookingCode}</span></p>}
                        {ocrResult.totalOdds && <p className="text-xs text-[#71767b]">Total Odds: <span className="text-white font-bold">{ocrResult.totalOdds}</span></p>}
                        {ocrResult.matches.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-white">Set prediction for each match:</p>
                            {ocrResult.matches.map((m: any, i: number) => (
                              <div key={i} className="bg-[#0a0a0a] rounded-lg p-2">
                                <p className="text-xs text-white font-semibold mb-1">{m.home} vs {m.away}</p>
                                <div className="flex flex-wrap gap-1">
                                  {['1','X','2','1X','X2','12','GG','NG','Over 1.5','Over 2.5','Under 2.5'].map(pred => (
                                    <button key={pred}
                                      onClick={() => {
                                        const updated = [...ocrResult.matches];
                                        updated[i] = { ...updated[i], prediction: pred };
                                        setOcrResult({ ...ocrResult, matches: updated });
                                      }}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                                        m.prediction === pred ? 'bg-[#ef4444] text-white' : 'bg-[#1f1f1f] text-[#71767b]'
                                      }`}>
                                      {pred}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {ocrResult.matches.length === 0 && (
                          <p className="text-xs text-yellow-400">No matches detected. Tip will be posted with image only.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Caption</label>
                  <textarea value={caption} onChange={e => setCaption(e.target.value)}
                    placeholder="Add context about this slip..."
                    className="w-full h-20 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50 resize-none" />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#1f1f1f] bg-black/50 flex gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#111] border border-[#1f1f1f] text-white text-sm">Cancel</button>
                <button onClick={handleSubmit} disabled={!imageBase64}
                  className={cn('flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all text-sm',
                    imageBase64 ? 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white' : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] cursor-not-allowed'
                  )}>
                  <Send className="w-4 h-4" /> Post Slip
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
