import { useState, useEffect } from 'react';
import { Loader2, UserX } from 'lucide-react';
import { useAuth } from '../../../auth/hooks/AuthContext';
import { db } from '../../../lib/firebase';
import {
  collection, getDocs, doc, getDoc,
  deleteDoc
} from 'firebase/firestore';
import { useSettings } from './settingsComponents';

interface BlockedUser { id: string; name: string; handle: string; }

export function BlockedAccountsPage() {
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const { showToast } = useSettings();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const snap = await getDocs(collection(db, 'users', userId, 'blocked'));
      const list: BlockedUser[] = [];
      for (const d of snap.docs) {
        const userDoc = await getDoc(doc(db, 'users', d.id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          list.push({ id: d.id, name: data.displayName || 'User', handle: `@${(data.displayName || '').toLowerCase().replace(/\s/g, '')}` });
        }
      }
      setBlocked(list);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleUnblock = async (blockedId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'blocked', blockedId));
    setBlocked(b => b.filter(u => u.id !== blockedId));
    showToast('User unblocked');
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#ef4444] animate-spin" /></div>;

  return (
    <div>
      <p className="px-4 py-3 text-xs text-[#71767b] border-b border-[#1f1f1f]">
        Blocked users cannot follow you, message you, or see your content.
      </p>
      {blocked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UserX className="w-10 h-10 text-[#71767b] mb-3" />
          <p className="font-bold text-white mb-1">No blocked accounts</p>
          <p className="text-xs text-[#71767b]">Users you block will appear here</p>
        </div>
      ) : blocked.map(u => (
        <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f]">
          <div className="w-10 h-10 rounded-full bg-[#1f1f1f] flex items-center justify-center font-black text-white shrink-0">
            {u.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{u.name}</p>
            <p className="text-xs text-[#71767b]">{u.handle}</p>
          </div>
          <button onClick={() => handleUnblock(u.id)}
            className="px-3 py-1.5 border border-[#1f1f1f] rounded-full text-xs font-bold text-white hover:border-[#ef4444]/30 transition-colors">
            Unblock
          </button>
        </div>
      ))}
    </div>
  );
}
