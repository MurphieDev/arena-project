import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Copy, Check, Plus, Trash2, BarChart2,
  Users, Lock, Globe, Flag, EyeOff, UserMinus,
  VolumeX, Volume2
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Share Sheet ───────────────────────────────────────────────
interface ShareSheetProps {
  onClose: () => void;
  postContent?: string;
}

export function ShareSheet({ onClose, postContent }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(postContent ?? 'Check this out on Arena!');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    { label: 'Copy Link', emoji: '🔗', action: handleCopy, color: 'bg-blue-500/20 text-blue-400' },
    { label: 'Share via Email', emoji: '📧', action: () => window.open(`mailto:?body=${encodeURIComponent(postContent ?? '')}`), color: 'bg-green-500/20 text-green-400' },
    { label: 'Share to X', emoji: '𝕏', action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(postContent ?? '')}`), color: 'bg-sky-500/20 text-sky-400' },
    { label: 'Share to WhatsApp', emoji: '💬', action: () => window.open(`https://wa.me/?text=${encodeURIComponent(postContent ?? '')}`), color: 'bg-emerald-500/20 text-emerald-400' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end" onClick={onClose}
    >
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-[#0d0d0d] border-t border-[#1f1f1f] rounded-t-3xl px-5 pt-3 pb-10 pb-safe"
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-base text-white">Share Post</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-[#71767b]" />
          </button>
        </div>
        {postContent && (
          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl px-3 py-2.5 mb-4">
            <p className="text-xs text-[#71767b] line-clamp-2">{postContent}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {shareOptions.map(opt => (
            <button key={opt.label} onClick={opt.action}
              className="flex items-center gap-3 p-3 bg-[#111] border border-[#1f1f1f] rounded-xl hover:border-white/10 transition-all"
            >
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base', opt.color)}>{opt.emoji}</div>
              <span className="text-sm font-semibold text-white">{opt.label}</span>
            </button>
          ))}
        </div>
        <button onClick={handleCopy}
          className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-all', copied ? 'bg-green-500 text-white' : 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white hover:opacity-90')}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── More Menu ─────────────────────────────────────────────────
interface MoreMenuProps {
  onClose: () => void;
  userName?: string;
}

export function MoreMenu({ onClose, userName }: MoreMenuProps) {
  const [reported, setReported] = useState(false);
  const [muted, setMuted] = useState(false);

  const options = [
    { icon: Flag, label: reported ? 'Reported ✓' : 'Report Post', desc: 'Let us know if this post violates our guidelines', color: 'text-[#ef4444]', action: () => { setReported(true); setTimeout(onClose, 1000); } },
    { icon: muted ? Volume2 : VolumeX, label: muted ? `Unmute @${userName ?? 'user'}` : `Mute @${userName ?? 'user'}`, desc: muted ? 'You will see their posts again' : 'Stop seeing posts from this account', color: 'text-[#71767b]', action: () => setMuted(m => !m) },
    { icon: UserMinus, label: `Unfollow @${userName ?? 'user'}`, desc: 'Stop following this account', color: 'text-[#71767b]', action: onClose },
    { icon: EyeOff, label: 'Not interested in this post', desc: 'See fewer posts like this', color: 'text-[#71767b]', action: onClose },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end" onClick={onClose}
    >
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-[#0d0d0d] border-t border-[#1f1f1f] rounded-t-3xl px-5 pt-3 pb-10 pb-safe"
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-base text-white">Post Options</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-[#71767b]" />
          </button>
        </div>
        <div className="space-y-1">
          {options.map(opt => {
            const Icon = opt.icon;
            return (
              <button key={opt.label} onClick={opt.action} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left">
                <Icon className={cn('w-5 h-5 shrink-0', opt.color)} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold', opt.color)}>{opt.label}</p>
                  <p className="text-xs text-[#71767b] mt-0.5">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Poll Creator ──────────────────────────────────────────────
interface PollCreatorProps {
  onClose: () => void;
  onCreate: (poll: { question: string; options: string[]; duration: string }) => void;
}

export function PollCreator({ onClose, onCreate }: PollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState('1 day');

  const addOption = () => { if (options.length < 4) setOptions(prev => [...prev, '']); };
  const removeOption = (i: number) => { if (options.length > 2) setOptions(prev => prev.filter((_, idx) => idx !== i)); };
  const updateOption = (i: number, val: string) => setOptions(prev => prev.map((o, idx) => idx === i ? val : o));
  const canCreate = question.trim() && options.filter(o => o.trim()).length >= 2;
  const durations = ['1 day', '3 days', '7 days', '14 days'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center md:justify-center" onClick={onClose}
    >
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full md:max-w-lg bg-[#0d0d0d] border border-[#1f1f1f] rounded-t-3xl md:rounded-3xl px-5 pt-3 pb-10 pb-safe"
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 md:hidden" />
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#ef4444]" />
            <h3 className="font-black text-base text-white">Create Poll</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-[#71767b]" />
          </button>
        </div>
        <div className="mb-4">
          <label className="text-xs text-[#71767b] font-semibold mb-1.5 block">Poll Question</label>
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a question..."
            className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
          />
        </div>
        <div className="mb-4">
          <label className="text-xs text-[#71767b] font-semibold mb-1.5 block">Options ({options.length}/4)</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`}
                  className="flex-1 bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                />
                {options.length > 2 && (
                  <button onClick={() => removeOption(i)} className="p-2 text-[#71767b] hover:text-[#ef4444] transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 4 && (
            <button onClick={addOption} className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#1f1f1f] rounded-xl text-[#71767b] hover:border-[#ef4444]/30 hover:text-[#ef4444] transition-all text-sm font-semibold">
              <Plus className="w-4 h-4" /> Add Option
            </button>
          )}
        </div>
        <div className="mb-5">
          <label className="text-xs text-[#71767b] font-semibold mb-1.5 block">Poll Duration</label>
          <div className="grid grid-cols-4 gap-2">
            {durations.map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={cn('py-2 rounded-xl text-xs font-bold border transition-all', duration === d ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444]' : 'bg-[#111] border-[#1f1f1f] text-[#71767b] hover:border-white/20 hover:text-white')}
              >{d}</button>
            ))}
          </div>
        </div>
        <button disabled={!canCreate} onClick={() => { onCreate({ question, options: options.filter(o => o.trim()), duration }); onClose(); }}
          className="w-full py-3 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-40"
        >Create Poll</button>
      </motion.div>
    </motion.div>
  );
}

// ── Create Community ──────────────────────────────────────────
interface CreateCommunityProps {
  onClose: () => void;
  onCreate: (data: { name: string; description: string; category: string; type: string }) => void;
}

export function CreateCommunity({ onClose, onCreate }: CreateCommunityProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Football');
  const [type, setType] = useState('public');
  const categories = ['Football', 'Basketball', 'Tennis', 'F1', 'Cricket', 'Rugby', 'MMA', 'General'];
  const canCreate = name.trim() && description.trim();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center md:justify-center" onClick={onClose}
    >
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full md:max-w-lg bg-[#0d0d0d] border border-[#1f1f1f] rounded-t-3xl md:rounded-3xl px-5 pt-3 pb-10 pb-safe max-h-[90vh] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 md:hidden" />
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#ef4444]" />
            <h3 className="font-black text-base text-white">Create Community</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-[#71767b]" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#71767b] font-semibold mb-1.5 block">Community Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Premier League Fans"
              className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-[#71767b] font-semibold mb-1.5 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this community about?" rows={3}
              className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none resize-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-[#71767b] font-semibold mb-1.5 block">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={cn('py-2 rounded-xl text-xs font-bold border transition-all', category === cat ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444]' : 'bg-[#111] border-[#1f1f1f] text-[#71767b] hover:border-white/20 hover:text-white')}
                >{cat}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-[#71767b] font-semibold mb-1.5 block">Community Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ key: 'public', icon: Globe, label: 'Public', desc: 'Anyone can join' }, { key: 'private', icon: Lock, label: 'Private', desc: 'Invite only' }].map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.key} onClick={() => setType(t.key)}
                    className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all', type === t.key ? 'bg-[#ef4444]/15 border-[#ef4444]/40' : 'bg-[#111] border-[#1f1f1f] hover:border-white/10')}
                  >
                    <Icon className={cn('w-5 h-5', type === t.key ? 'text-[#ef4444]' : 'text-[#71767b]')} />
                    <p className={cn('text-xs font-bold', type === t.key ? 'text-[#ef4444]' : 'text-white')}>{t.label}</p>
                    <p className="text-[10px] text-[#71767b]">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <button disabled={!canCreate} onClick={() => { onCreate({ name, description, category, type }); onClose(); }}
            className="w-full py-3 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-40"
          >Create Community</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Follow Button ─────────────────────────────────────────────
interface FollowButtonProps {
  initialFollowing?: boolean;
  size?: 'sm' | 'md';
}

export function FollowButton({ initialFollowing = false, size = 'md' }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  return (
    <motion.button whileTap={{ scale: 0.95 }}
      onClick={e => { e.stopPropagation(); setFollowing(f => !f); }}
      className={cn('rounded-full font-bold transition-all shrink-0', size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm', following ? 'border border-white/20 text-white hover:border-[#ef4444]/50 hover:text-[#ef4444]' : 'bg-white text-black hover:bg-white/90')}
    >
      {following ? 'Following ✓' : 'Follow'}
    </motion.button>
  );
}
