import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SectionHeader, SettingRow, useSettings } from './settingsComponents';
import { useAuth } from '../../../auth/hooks/AuthContext';
import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function PrivacySettings() {
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const { showToast } = useSettings();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState({
    privateAccount: false,
    showWinRate: true,
    showFollowers: true,
    showActivity: true,
    allowMessages: true,
    allowMentions: true,
    showOnline: true,
  });

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, 'users', userId)).then(snap => {
      if (snap.exists() && snap.data().privacyPrefs) {
        setPrefs(p => ({ ...p, ...snap.data().privacyPrefs }));
      }
      setLoading(false);
    });
  }, [userId]);

  const toggle = async (key: keyof typeof prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await setDoc(doc(db, 'users', userId), {
        privacyPrefs: updated,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      showToast('Privacy settings saved ✅');
    } catch { showToast('Failed to save', 'error'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#ef4444] animate-spin" /></div>;

  return (
    <div>
      <SectionHeader title="Account Privacy" />
      <SettingRow label="Private Account" desc="Only approved followers can see your posts" toggle value={prefs.privateAccount} onChange={() => toggle('privateAccount')} />
      <SettingRow label="Show Online Status" desc="Let others see when you're active" toggle value={prefs.showOnline} onChange={() => toggle('showOnline')} />

      <SectionHeader title="Profile Visibility" />
      <SettingRow label="Show Win Rate" desc="Display your prediction win rate on profile" toggle value={prefs.showWinRate} onChange={() => toggle('showWinRate')} />
      <SettingRow label="Show Followers Count" desc="Display your follower count publicly" toggle value={prefs.showFollowers} onChange={() => toggle('showFollowers')} />
      <SettingRow label="Show Activity" desc="Let others see your recent activity" toggle value={prefs.showActivity} onChange={() => toggle('showActivity')} />

      <SectionHeader title="Interactions" />
      <SettingRow label="Allow Direct Messages" desc="Let anyone send you messages" toggle value={prefs.allowMessages} onChange={() => toggle('allowMessages')} />
      <SettingRow label="Allow Mentions" desc="Let others mention you in posts" toggle value={prefs.allowMentions} onChange={() => toggle('allowMentions')} />
    </div>
  );
}
