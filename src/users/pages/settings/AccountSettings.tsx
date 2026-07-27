import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import type { UserRole } from '../../../core/types';
import { useAuth } from '../../../auth/hooks/AuthContext';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  SectionHeader, SettingRow, useSettings,
} from './settingsComponents';

interface AccountSettingsProps { userRole: UserRole; }

export function AccountSettings({ userRole }: AccountSettingsProps) {
  const isTipster = userRole === 'tipster';
  const { user, logout } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const navigate = useNavigate();
  const { showToast, showConfirm } = useSettings();

  const [name, setName] = useState(currentUser?.name || currentUser?.displayName || '');
  const [email] = useState(currentUser?.email || '');
  const [handle, setHandle] = useState(currentUser?.handle || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { showToast('Display name cannot be empty', 'error'); return; }
    if (!userId) { showToast('Not authenticated', 'error'); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        displayName: name.trim(),
        handle: handle.trim() || `@${name.trim().toLowerCase().replace(/\s/g, '')}`,
      });
      showToast('Profile saved successfully! ✅');
    } catch (e) {
      showToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'users', userId), { deactivated: true });
      await logout();
      showToast('Account deactivated');
    } catch { showToast('Failed to deactivate account', 'error'); }
  };

  const handleDelete = async () => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      await logout();
    } catch { showToast('Failed to delete account. Contact support.', 'error'); }
  };

  return (
    <div>
      <SectionHeader title="Profile Information" />
      <div className="p-4 space-y-3 border-b border-[#1f1f1f]">
        <div>
          <label className="text-xs text-[#71767b] font-semibold mb-1 block">Display Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all" />
        </div>
        <div>
          <label className="text-xs text-[#71767b] font-semibold mb-1 block">Username</label>
          <input value={handle} onChange={e => setHandle(e.target.value)}
            className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all" />
        </div>
        <div>
          <label className="text-xs text-[#71767b] font-semibold mb-1 block">Email</label>
          <input value={email} disabled type="email"
            className="w-full bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-sm text-[#71767b] outline-none opacity-60 cursor-not-allowed" />
          <p className="text-[10px] text-[#71767b] mt-1">Email cannot be changed here. Contact support.</p>
        </div>
        <button type="button" onClick={handleSave} disabled={saving}
          className="w-full py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white hover:bg-[#dc2626] transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {isTipster && (
        <>
          <SectionHeader title="Tipster Settings" />
          <SettingRow label="Payout Account" desc="Manage your bank account for payouts" onClick={() => navigate('/settings/account/payout')} />
          <SettingRow label="Channel Settings" desc="Manage your prediction channels" onClick={() => navigate('/settings/account/channels')} />
          <SettingRow label="Subscription Pricing" desc="Set prices for your paid channels" onClick={() => navigate('/settings/account/pricing')} />
        </>
      )}

      <SectionHeader title="Account Actions" />
      <SettingRow label="Change Password" desc="Update your password" onClick={() => navigate('/settings/security')} />
      <SettingRow label="Connected Accounts" desc="Google, Apple" onClick={() => navigate('/settings/account/connected')} />
      <SettingRow label="Download My Data" desc="Get a copy of your Arena data" onClick={() => navigate('/settings/account/download-data')} />

      <SectionHeader title="Danger Zone" />
      <SettingRow label="Deactivate Account" desc="Temporarily disable your account" danger
        onClick={() => showConfirm({ title: 'Deactivate Account?', desc: 'Your account will be hidden. You can reactivate anytime.', onConfirm: handleDeactivate })} />
      <SettingRow label="Delete Account" desc="Permanently delete your account and data" danger
        onClick={() => showConfirm({ title: 'Delete Account?', desc: 'This is permanent and cannot be undone.', onConfirm: handleDelete })} />

      <div className="p-4">
        <button type="button" onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3 border border-[#ef4444]/30 rounded-full text-[#ef4444] text-sm font-bold hover:bg-[#ef4444]/10 transition-all">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
