import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Image, X, Check, Loader,
  AlertTriangle, Zap, Eye
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import {
  collection, addDoc, serverTimestamp, doc, updateDoc, increment
} from 'firebase/firestore';

// ── Config ─────────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD = 'dxopunvm2';
const CLOUDINARY_PRESET = 'arena_betslips';

// ── Types ──────────────────────────────────────────────────────────────────
interface ExtractedMatch {
  home: string;
  away: string;
  prediction: string;
  odds: string;
  time: string;
}

interface ExtractedData {
  bookingCode: string;
  platform: string;
  totalOdds: string;
  matches: ExtractedMatch[];
  rawText: string;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  subscribers: number;
}

interface BetSlipUploadProps {
  channels: Channel[];
  tipsterId: string;
  tipsterName: string;
  onSuccess: () => void;
}

// ── Upload to Cloudinary ───────────────────────────────────────────────────
async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('folder', 'arena/betslips');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json();
  if (!data.secure_url) throw new Error('Cloudinary upload failed');
  return data.secure_url;
}

// ── OCR via Netlify Function (fixes CORS) ─────────────────────────────────
async function extractTextFromImage(imageUrl: string): Promise<string> {
  const res = await fetch('/.netlify/functions/ocr-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });
  if (!res.ok) throw new Error('OCR proxy failed');
  const data = await res.json();
  if (data.IsErroredOnProcessing) throw new Error('OCR failed to read image');
  return data.ParsedResults?.[0]?.ParsedText || '';
}

// ── Parse OCR text ─────────────────────────────────────────────────────────
function parseOCRText(rawText: string, platform: string): ExtractedData {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // Booking code
  let bookingCode = '';
  for (const line of lines) {
    const codeMatch =
      line.match(/(?:booking\s*(?:code|id)|code|ref(?:erence)?)[:\s]+([A-Z0-9]{4,15})/i) ||
      line.match(/\b([A-Z0-9]{6,12})\b/);
    if (codeMatch) { bookingCode = codeMatch[1]; break; }
  }

  // Total odds
  let totalOdds = '';
  for (const line of lines) {
    const oddsMatch = line.match(/(?:total\s*odds?|possible\s*win(?:nings?)?|odds?)[:\s]+([\d.]+)/i);
    if (oddsMatch) { totalOdds = oddsMatch[1]; break; }
  }

  // Matches via "vs" pattern
  const matches: ExtractedMatch[] = [];
  const vsPattern = /([A-Za-z\s.'\-]+?)\s+(?:vs?\.?|v\.?)\s+([A-Za-z\s.'\-]+?)(?:\s+([\d.]+))?(?:\s|$)/gi;
  let match;
  while ((match = vsPattern.exec(rawText)) !== null) {
    const home = match[1].trim();
    const away = match[2].trim();
    const odds = match[3] || '';
    if (home.length > 2 && away.length > 2 && home.length < 40 && away.length < 40) {
      matches.push({ home, away, prediction: '', odds, time: '' });
    }
  }

  // Map predictions
  const predLines = lines.filter(l =>
    /\b(1|X|2|1X|X2|12|GG|NG|over|under|btts|yes|no|home|draw|away)\b/i.test(l)
  );
  predLines.forEach((line, i) => {
    if (matches[i]) {
      const predMatch = line.match(/\b(1X2|1|X|2|1X|X2|12|GG|NG|Over\s*[\d.]+|Under\s*[\d.]+|BTTS|Home|Draw|Away)\b/i);
      if (predMatch) matches[i].prediction = predMatch[1];
    }
  });

  // Map times
  const timePattern = /\b(\d{1,2}[:/]\d{2}(?:\s*(?:AM|PM))?)\b/g;
  let timeMatch;
  let timeIndex = 0;
  while ((timeMatch = timePattern.exec(rawText)) !== null && timeIndex < matches.length) {
    matches[timeIndex].time = timeMatch[1];
    timeIndex++;
  }

  return {
    bookingCode,
    platform,
    totalOdds,
    matches: matches.slice(0, 20),
    rawText,
  };
}

// ── BetSlip Upload Component ───────────────────────────────────────────────
export function BetSlipUpload({ channels, tipsterId, tipsterName, onSuccess }: BetSlipUploadProps) {
  const [step, setStep] = useState<'upload' | 'processing' | 'preview' | 'posting'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [platform, setPlatform] = useState('Bet9ja');
  const [error, setError] = useState('');
  const [processingStep, setProcessingStep] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const platforms = ['Bet9ja', 'Sportybet', '1xBet', 'Betway', 'Parimatch', 'MSport', 'BangBet'];

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Image too large. Maximum 10MB'); return; }

    setError('');
    setStep('processing');

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      setProcessingStep('Uploading bet slip...');
      const url = await uploadToCloudinary(file);
      setImageUrl(url);

      setProcessingStep('Reading bet slip with OCR...');
      const rawText = await extractTextFromImage(url);

      setProcessingStep('Extracting match details...');
      const data = parseOCRText(rawText, platform);

      setExtracted(data);
      setStep('preview');
    } catch (e: any) {
      setError(e.message || 'Failed to process image. Try again.');
      setStep('upload');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handlePost = async () => {
    if (!selectedChannelId || !extracted) return;
    if (extracted.matches.length === 0) {
      setError('No matches found. Try a clearer image.');
      return;
    }
    setStep('posting');
    try {
      await addDoc(collection(db, 'channels', selectedChannelId, 'tips'), {
        tipsterId,
        tipsterName,
        bookingCode: extracted.bookingCode,
        platform: extracted.platform,
        totalOdds: extracted.totalOdds,
        matches: extracted.matches,
        imageUrl,
        analysis,
        status: 'pending',
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
        source: 'ocr',
      });

      // Update tipster tip count
      await updateDoc(doc(db, 'users', tipsterId), {
        tipsCount: increment(1),
      });

      onSuccess();
    } catch (e) {
      setError('Failed to post tip. Try again.');
      setStep('preview');
    }
  };

  return (
    <div className="space-y-4">

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0" />
            <p className="text-xs text-[#ef4444] flex-1">{error}</p>
            <button onClick={() => setError('')}><X className="w-4 h-4 text-[#ef4444]" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload */}
      {step === 'upload' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mb-4">
            <p className="text-xs text-[#71767b] font-semibold mb-2">Betting Platform</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {platforms.map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                    platform === p ? 'bg-[#ef4444] text-white' : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] hover:text-white'
                  )}>{p}</button>
              ))}
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-[#1f1f1f] hover:border-[#ef4444]/40 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-[#ef4444]/[0.02] group">
            <div className="w-14 h-14 bg-[#ef4444]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#ef4444]/20 transition-all">
              <Upload className="w-7 h-7 text-[#ef4444]" />
            </div>
            <p className="font-bold text-white mb-1">Upload Bet Slip</p>
            <p className="text-xs text-[#71767b] mb-4">Screenshot or photo of your bet slip</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ef4444] rounded-full text-xs font-bold text-white">
              <Image className="w-3.5 h-3.5" /> Choose Image
            </div>
            <p className="text-[10px] text-[#71767b] mt-3">JPG, PNG, WEBP · Max 10MB</p>
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} />

          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 mt-3">
            <p className="text-xs font-bold text-white mb-2">💡 Tips for best results</p>
            {[
              'Use a screenshot directly from the betting app',
              'Make sure text is clear and not blurry',
              'Avoid angled or cropped images',
            ].map((tip, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] shrink-0" />
                <p className="text-xs text-[#71767b]">{tip}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Processing */}
      {step === 'processing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center py-12 text-center">
          {imagePreview && (
            <div className="w-32 h-32 rounded-2xl overflow-hidden mb-6 border border-[#1f1f1f]">
              <img src={imagePreview} alt="Bet slip" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="w-10 h-10 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-bold text-white mb-1">{processingStep}</p>
          <p className="text-xs text-[#71767b]">This takes a few seconds...</p>
        </motion.div>
      )}

      {/* Preview */}
      {step === 'preview' && extracted && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

          {/* Image preview */}
          <div className="flex items-center gap-3 bg-[#111] border border-[#1f1f1f] rounded-xl p-3">
            {imagePreview && (
              <img src={imagePreview} alt="Slip" className="w-14 h-14 rounded-xl object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Bet slip uploaded ✅</p>
              <p className="text-xs text-[#71767b]">{extracted.matches.length} match{extracted.matches.length !== 1 ? 'es' : ''} extracted</p>
            </div>
            <button onClick={() => { setStep('upload'); setExtracted(null); setImagePreview(''); }}
              className="p-1.5 rounded-full bg-white/5 text-[#71767b] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Extracted data */}
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#ef4444]" />
                <p className="text-sm font-bold text-white">Extracted Data</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[#71767b]">
                <Eye className="w-3 h-3" /> Read only
              </div>
            </div>

            <div className="px-4 py-3 space-y-2 border-b border-[#1f1f1f]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#71767b]">Platform</span>
                <span className="text-xs font-bold text-white">{extracted.platform}</span>
              </div>
              {extracted.bookingCode && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#71767b]">Booking Code</span>
                  <span className="text-xs font-bold text-[#ef4444] font-mono">{extracted.bookingCode}</span>
                </div>
              )}
              {extracted.totalOdds && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#71767b]">Total Odds</span>
                  <span className="text-xs font-bold text-green-400">{extracted.totalOdds}x</span>
                </div>
              )}
            </div>

            {extracted.matches.length > 0 ? (
              <div className="divide-y divide-[#1f1f1f]">
                {extracted.matches.map((match, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-white">{match.home} vs {match.away}</p>
                      {match.time && <span className="text-[10px] text-[#71767b]">{match.time}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      {match.prediction && (
                        <span className="text-[10px] bg-[#ef4444]/20 text-[#ef4444] px-2 py-0.5 rounded-full font-bold">
                          {match.prediction}
                        </span>
                      )}
                      {match.odds && (
                        <span className="text-[10px] text-green-400 font-bold">@ {match.odds}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-[#71767b]">No matches detected automatically</p>
                <button onClick={() => setStep('upload')} className="mt-2 text-xs text-[#ef4444] font-bold">
                  Try a clearer image
                </button>
              </div>
            )}
          </div>

          {/* Select channel */}
          <div>
            <p className="text-xs text-[#71767b] font-semibold mb-2">Post to Channel *</p>
            <div className="space-y-2">
              {channels.map(ch => (
                <button key={ch.id} onClick={() => setSelectedChannelId(ch.id)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
                    selectedChannelId === ch.id ? 'bg-[#ef4444]/10 border-[#ef4444]/30' : 'bg-[#111] border-[#1f1f1f] hover:border-white/10'
                  )}>
                  <div className="w-8 h-8 rounded-full bg-[#ef4444]/20 flex items-center justify-center font-black text-[#ef4444] text-sm shrink-0">
                    {ch.name[0]}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-white">{ch.name}</p>
                    <p className="text-xs text-[#71767b]">{ch.type === 'paid' ? 'VIP' : 'Free'} · {(ch.subscribers || 0).toLocaleString()} subscribers</p>
                  </div>
                  {selectedChannelId === ch.id && <Check className="w-4 h-4 text-[#ef4444]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Analysis */}
          <div>
            <p className="text-xs text-[#71767b] font-semibold mb-2">Analysis (Optional)</p>
            <textarea value={analysis} onChange={e => setAnalysis(e.target.value)}
              placeholder="Share your reasoning and analysis..."
              rows={3}
              className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none resize-none transition-all"
            />
          </div>

          <button onClick={handlePost} disabled={!selectedChannelId || extracted.matches.length === 0}
            className="w-full py-3 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-40 shadow-lg shadow-red-500/20">
            Post Tip 🎯
          </button>
        </motion.div>
      )}

      {/* Posting */}
      {step === 'posting' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center py-12 text-center">
          <Loader className="w-10 h-10 text-[#ef4444] animate-spin mb-4" />
          <p className="font-bold text-white mb-1">Posting your tip...</p>
          <p className="text-xs text-[#71767b]">Almost there!</p>
        </motion.div>
      )}
    </div>
  );
}
