import { useState, useEffect } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../../../auth/hooks/AuthContext';
import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useSettings } from './settingsComponents';

export function PayoutAccountPage() {
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const { showToast } = useSettings();

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, 'users', userId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setBankName(data.payoutBankName || '');
        setAccountNumber(data.payoutAccountNumber || '');
        setAccountName(data.payoutAccountName || '');
      }
      setLoading(false);
    });
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    if (accountNumber.length < 10) { showToast('Enter a valid 10-digit account number', 'error'); return; }
    if (!bankName.trim()) { showToast('Enter your bank name', 'error'); return; }
    if (!accountName.trim()) { showToast('Enter your account name', 'error'); return; }
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', userId), {
        payoutBankName: bankName.trim(),
        payoutAccountNumber: accountNumber.trim(),
        payoutAccountName: accountName.trim(),
        payoutUpdatedAt: serverTimestamp(),
      }, { merge: true });
      showToast('Payout account saved! ✅');
    } catch { showToast('Failed to save. Try again.', 'error'); }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-6 h-6 text-[#ef4444] animate-spin" />
    </div>
  );

  return (
    <div>
      <p className="px-4 py-3 text-xs text-[#71767b] leading-relaxed border-b border-[#1f1f1f]">
        Add the bank account where your tipster earnings will be paid out.
      </p>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 p-4 bg-[#111] border border-[#1f1f1f] rounded-xl">
          <Building2 className="w-8 h-8 text-[#ef4444] shrink-0" />
          <div>
            <p className="text-sm font-bold text-white">Nigerian Bank Account</p>
            <p className="text-xs text-[#71767b]">Payouts processed within 2–3 business days</p>
          </div>
        </div>
        <div>
          <label className="text-xs text-[#71767b] font-semibold mb-1 block">Bank Name</label>
          <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. GTBank, Access, Zenith"
            className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none" />
        </div>
        <div>
          <label className="text-xs text-[#71767b] font-semibold mb-1 block">Account Number</label>
          <input value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric" placeholder="10-digit account number"
            className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none" />
        </div>
        <div>
          <label className="text-xs text-[#71767b] font-semibold mb-1 block">Account Name</label>
          <input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="As it appears on your bank account"
            className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none" />
        </div>
        <button type="button" onClick={handleSave} disabled={saving}
          className="w-full py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white hover:bg-[#dc2626] transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Payout Account'}
        </button>
      </div>
    </div>
  );
}
