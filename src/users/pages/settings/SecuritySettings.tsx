import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertTriangle, Trash2 } from 'lucide-react';
import { SectionHeader, SettingRow, useSettings } from './settingsComponents';
import { useAuth } from '../../../auth/hooks/AuthContext';
import { auth } from '../../../lib/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';

export function SecuritySettings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showToast, showConfirm } = useSettings();
  const [twoFA, setTwoFA] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async () => {
    if (!currentPassword) { showToast('Enter your current password', 'error'); return; }
    if (!newPassword) { showToast('Enter your new password', 'error'); return; }
    if (newPassword.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }

    setSaving(true);
    try {
      const fbUser = auth.currentUser;
      if (!fbUser || !fbUser.email) { showToast('Not authenticated', 'error'); return; }
      const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
      await reauthenticateWithCredential(fbUser, credential);
      await updatePassword(fbUser, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully! ✅');
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        showToast('Current password is incorrect', 'error');
      } else {
        showToast(e.message || 'Failed to update password', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const fbUser = auth.currentUser;
      if (fbUser) await deleteUser(fbUser);
      await logout();
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        showToast('Please sign out and sign back in before deleting your account', 'error');
      } else {
        showToast('Failed to delete account. Contact support.', 'error');
      }
    }
  };

  return (
    <div>
      <SectionHeader title="Login Security" />
      <SettingRow label="Two-Factor Authentication" desc="Add an extra layer of security" toggle value={twoFA}
        onChange={v => { setTwoFA(v); showToast('2FA coming soon'); }} />
      <SettingRow label="Login Alerts" desc="Get notified of new logins" toggle value={loginAlerts}
        onChange={v => { setLoginAlerts(v); showToast(`Login alerts ${v ? 'enabled' : 'disabled'}`); }} />

      <SectionHeader title="Change Password" />
      <div className="p-4 space-y-3 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-xl px-4 py-2.5 transition-all">
          <Lock className="w-4 h-4 text-[#71767b] shrink-0" />
          <input type={showCurrent ? 'text' : 'password'} placeholder="Current password" value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none" />
          <button type="button" onClick={() => setShowCurrent(s => !s)} className="text-[#71767b] hover:text-white">
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-xl px-4 py-2.5 transition-all">
          <Lock className="w-4 h-4 text-[#71767b] shrink-0" />
          <input type={showNew ? 'text' : 'password'} placeholder="New password (min 8 chars)" value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none" />
          <button type="button" onClick={() => setShowNew(s => !s)} className="text-[#71767b] hover:text-white">
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <input type="password" placeholder="Confirm new password" value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none transition-all" />
        <button type="button" onClick={handlePasswordChange} disabled={saving}
          className="w-full py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white hover:bg-[#dc2626] transition-colors disabled:opacity-50">
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </div>

      <SectionHeader title="Sessions" />
      <SettingRow label="Active Sessions" desc="Manage devices logged in to your account" onClick={() => navigate('/settings/security/sessions')} />
      <SettingRow label="Sign Out All Devices" danger
        onClick={() => showConfirm({ title: 'Sign out all devices?', desc: 'You will be logged out from all active sessions.', onConfirm: logout })} />

      <SectionHeader title="Danger" />
      <div className="px-4 py-3 border-b border-[#1f1f1f]">
        <div className="flex items-start gap-3 p-3 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Delete Account</p>
            <p className="text-xs text-[#71767b] mt-0.5 mb-2 leading-relaxed">This action is permanent and cannot be undone.</p>
            <button type="button"
              onClick={() => showConfirm({ title: 'Delete Account?', desc: 'This is permanent and cannot be undone.', onConfirm: handleDeleteAccount })}
              className="flex items-center gap-1.5 text-xs text-[#ef4444] font-bold hover:underline">
              <Trash2 className="w-3 h-3" /> Permanently Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
