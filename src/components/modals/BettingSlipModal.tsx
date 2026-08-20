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
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        const matches: any[] = [];
        lines.forEach((line: string) => {
          const vsMatch = line.match(/(.+?)\s+(?:vs\.?|v\.?|-)\s+(.+)/i);
          if (vsMatch) {
            matches.push({
              home: vsMatch[1].trim(),
              away: vsMatch[2].trim(),
              odds: '',
              prediction: '',
              status: 'pending',
            });
          }
        });
        const codeMatch = text.match(/(?:booking code|code|ref)[:\s]*([A-Z0-9]{5,})/i);
        const oddsMatch = text.match(/(?:total odds|odds)[:\s]*([\d.]+)/i);
        setOcrResult({
          matches,
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
    onSubmit({
      imageUrl: imageBase64, // base64 string - safe for Firestore
      caption,
      matches: ocrResult?.matches || [],
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
