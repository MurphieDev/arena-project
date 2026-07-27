import { useState, useEffect } from 'react';
import { Loader2, BellOff } from 'lucide-react';
import { useAuth } from '../../../auth/hooks/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useSettings } from './settingsComponents';

interface MutedUser { id: string; name: string; handle: string; }

export function MutedAccountsPage() {
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const { showToast } = useSettings();
  const [muted, setMuted] = useState<MutedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const snap = await getDocs(collection(db, 'users', userId, 'muted'));
      const list: MutedUser[] = [];
      for (const d of snap.docs) {
        const userDoc = await getDoc(doc(db, 'users', d.id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          list.push({ id: d.id, name: data.displayName || 'User', handle: `@${(data.displayName || '').toLowerCase().replace(/\s/g, '')}` });
        }
      }
      setMuted(list);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleUnmute = async (mutedId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'muted', mutedId));
    setMuted(m => m.filter(u => u.id !== mutedId));
    showToast('User unmuted');
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#ef4444] animate-spin" /></div>;

  return (
    <div>
      <p className="px-4 py-3 text-xs text-[#71767b] border-b border-[#1f1f1f]">
        Muted users' posts won't appear in your feed.
      </p>
      {muted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BellOff className="w-10 h-10 text-[#71767b] mb-3" />
          <p className="font-bold text-white mb-1">No muted accounts</p>
          <p className="text-xs text-[#71767b]">Users you mute will appear here</p>
        </div>
      ) : muted.map(u => (
        <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f]">
          <div className="w-10 h-10 rounded-full bg-[#1f1f1f] flex items-center justify-center font-black text-white shrink-0">
            {u.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{u.name}</p>
            <p className="text-xs text-[#71767b]">{u.handle}</p>
          </div>
          <button onClick={() => handleUnmute(u.id)}
            className="px-3 py-1.5 border border-[#1f1f1f] rounded-full text-xs font-bold text-white hover:border-[#ef4444]/30 transition-colors">
            Unmute
          </button>
        </div>
      ))}
    </div>
  );
}
