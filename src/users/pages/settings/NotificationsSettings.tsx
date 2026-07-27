import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SectionHeader, SettingRow, useSettings } from './settingsComponents';
import { useAuth } from '../../../auth/hooks/AuthContext';
import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function NotificationsSettings() {
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const { showToast } = useSettings();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState({
    predictions: true, results: true, followers: true,
    messages: true, communities: true, promotions: false,
    emailDigest: true, pushEnabled: true,
  });

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, 'users', userId)).then(snap => {
      if (snap.exists() && snap.data().notificationPrefs) {
        setPrefs(p => ({ ...p, ...snap.data().notificationPrefs }));
      }
      setLoading(false);
    });
  }, [userId]);

  const toggle = async (key: keyof typeof prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await setDoc(doc(db, 'users', userId), {
        notificationPrefs: updated,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      showToast('Preferences saved ✅');
    } catch { showToast('Failed to save', 'error'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#ef4444] animate-spin" /></div>;

  return (
    <div>
      <SectionHeader title="Push Notifications" />
      <SettingRow label="Enable Push Notifications" desc="Allow Arena to send you notifications" toggle value={prefs.pushEnabled} onChange={() => toggle('pushEnabled')} />

      <SectionHeader title="Activity" />
      <SettingRow label="Predictions & Tips" desc="New tips from tipsters you follow" toggle value={prefs.predictions} onChange={() => toggle('predictions')} />
      <SettingRow label="Tip Results" desc="When your tips are verified as won or lost" toggle value={prefs.results} onChange={() => toggle('results')} />
      <SettingRow label="New Followers" desc="When someone follows you" toggle value={prefs.followers} onChange={() => toggle('followers')} />
      <SettingRow label="Messages" desc="New direct messages" toggle value={prefs.messages} onChange={() => toggle('messages')} />
      <SettingRow label="Communities" desc="Activity in communities you've joined" toggle value={prefs.communities} onChange={() => toggle('communities')} />

      <SectionHeader title="Email" />
      <SettingRow label="Weekly Digest" desc="Weekly summary of top predictions" toggle value={prefs.emailDigest} onChange={() => toggle('emailDigest')} />
      <SettingRow label="Promotions" desc="Special offers and announcements" toggle value={prefs.promotions} onChange={() => toggle('promotions')} />
    </div>
  );
}
