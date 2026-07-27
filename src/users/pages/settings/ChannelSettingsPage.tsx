import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, Settings, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../auth/hooks/AuthContext';
import { getChannelsByOwner, updateChannelSettings, type ChannelData } from './channelData';
import { useSettings } from './settingsComponents';

export function ChannelSettingsPage() {
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const navigate = useNavigate();
  const { showToast } = useSettings();
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ChannelData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getChannelsByOwner(userId).then(list => {
      setChannels(list);
      setLoading(false);
    });
  }, [userId]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateChannelSettings(selected.id, {
        name: selected.name,
        bio: selected.bio,
        price: selected.price,
        type: selected.type,
      });
      setChannels(c => c.map(ch => ch.id === selected.id ? selected : ch));
      showToast('Channel settings saved ✅');
    } catch { showToast('Failed to save', 'error'); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#ef4444] animate-spin" /></div>;

  if (channels.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <Settings className="w-10 h-10 text-[#71767b] mb-3" />
      <p className="font-bold text-white mb-1">No channels yet</p>
      <p className="text-xs text-[#71767b]">Create a channel from the Predictions page</p>
    </div>
  );

  if (selected) return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f]">
        <button onClick={() => setSelected(null)} className="text-[#71767b] hover:text-white text-sm">← Back</button>
        <p className="font-bold text-white">{selected.name}</p>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-[#71767b] font-semibold mb-1 block">Channel Name</label>
          <input value={selected.name} onChange={e => setSelected(s => s ? { ...s, name: e.target.value } : null)}
            className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
        </div>
        <div>
          <label className="text-xs text-[#71767b] font-semibold mb-1 block">Bio</label>
          <textarea value={selected.bio} onChange={e => setSelected(s => s ? { ...s, bio: e.target.value } : null)} rows={3}
            className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none resize-none" />
        </div>
        <div>
          <label className="text-xs text-[#71767b] font-semibold mb-1 block">Channel Type</label>
          <div className="flex gap-2">
            {(['free', 'paid'] as const).map(type => (
              <button key={type} onClick={() => setSelected(s => s ? { ...s, type } : null)}
                className={cn('flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-all',
                  selected.type === type ? 'bg-[#ef4444] text-white' : 'bg-[#111] border border-[#1f1f1f] text-[#71767b]'
                )}>{type}</button>
            ))}
          </div>
        </div>
        {selected.type === 'paid' && (
          <div>
            <label className="text-xs text-[#71767b] font-semibold mb-1 block">Monthly Price (₦)</label>
            <input type="number" value={selected.price} onChange={e => setSelected(s => s ? { ...s, price: Number(e.target.value) } : null)}
              className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
          </div>
        )}
        <button onClick={() => navigate(`/settings/account/channels/${selected.id}/members`)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#111] border border-[#1f1f1f] rounded-xl">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#ef4444]" />
            <span className="text-sm font-bold text-white">Manage Members</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-[#71767b]">{selected.subscribers}</span>
            <ChevronRight className="w-4 h-4 text-[#71767b]" />
          </div>
        </button>
        <button onClick={handleSave} disabled={saving}
          className="w-full py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white hover:bg-[#dc2626] transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <p className="px-4 py-3 text-xs text-[#71767b] border-b border-[#1f1f1f]">Select a channel to manage its settings.</p>
      {channels.map(ch => (
        <button key={ch.id} onClick={() => setSelected(ch)}
          className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors text-left">
          <div className="w-10 h-10 rounded-full bg-[#ef4444] flex items-center justify-center font-black text-white shrink-0">
            {ch.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{ch.name}</p>
            <p className="text-xs text-[#71767b]">{ch.subscribers} members · {ch.type === 'paid' ? `₦${ch.price.toLocaleString()}/mo` : 'Free'}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#71767b]" />
        </button>
      ))}
    </div>
  );
}
