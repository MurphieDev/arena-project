import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Bell, Monitor, Shield,
  ChevronRight, LogOut, Moon, Sun,
  Eye, EyeOff, Trash2, AlertTriangle, CheckCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  onAuthStateChanged, signOut, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider,
  deleteUser, sendPasswordResetEmail
} from 'firebase/auth';

// ── Toggle ─────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={cn('w-11 h-6 rounded-full transition-all relative shrink-0',
        value ? 'bg-[#ef4444]' : 'bg-[#71767b]/40'
      )}>
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
      />
    </button>
  );
}

// ── Setting Row ────────────────────────────────────────────────────────────
function SettingRow({ label, desc, toggle, value, onChange, onClick, danger }: {
  label: string; desc?: string; toggle?: boolean;
  value?: boolean; onChange?: (v: boolean) => void;
  onClick?: () => void; danger?: boolean;
}) {
  return (
    <div onClick={onClick}
      className={cn('flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] transition-colors',
        onClick && 'cursor-pointer hover:bg-white/[0.02]',
        danger && 'hover:bg-[#ef4444]/5'
      )}>
      <div className="flex-1 min-w-0 mr-4">
        <p className={cn('text-sm font-semibold', danger ? 'text-[#ef4444]' : 'text-white')}>{label}</p>
        {desc && <p className="text-xs text-[#71767b] mt-0.5">{desc}</p>}
      </div>
      {toggle && value !== undefined && onChange
        ? <Toggle value={value} onChange={onChange} />
        : onClick && <ChevronRight className={cn('w-4 h-4 shrink-0', danger ? 'text-[#ef4444]' : 'text-[#71767b]')} />
      }
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 py-2 bg-[#111]">
      <p className="text-xs font-black text-[#71767b] uppercase tracking-wider">{title}</p>
    </div>
  );
}

// ── Settings Page ──────────────────────────────────────────────────────────
export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'account' | 'privacy' | 'notifications' | 'display' | 'security'>('account');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Account
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  // Privacy
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);

  // Notifications
  const [pushNotifs, setPushNotifs] = useState(true);
  const [matchAlerts, setMatchAlerts] = useState(true);
  const [predictionResults, setPredictionResults] = useState(true);
  const [newFollowers, setNewFollowers] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(false);

  // Display
  const [darkMode, setDarkMode] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [autoplayVideos, setAutoplayVideos] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Security
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        setEmail(user.email || '');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || '');
          setPrivateAccount(data.privateAccount || false);
          setShowActivity(data.showActivity ?? true);
          setAllowMessages(data.allowMessages ?? true);
          setShowPredictions(data.showPredictions ?? true);
          setPushNotifs(data.pushNotifs ?? true);
          setMatchAlerts(data.matchAlerts ?? true);
          setPredictionResults(data.predictionResults ?? true);
          setNewFollowers(data.newFollowers ?? true);
          setMentions(data.mentions ?? true);
          setMessageNotifs(data.messageNotifs ?? true);
          setEmailNotifs(data.emailNotifs || false);
          setCompactMode(data.compactMode || false);
          setAutoplayVideos(data.autoplayVideos ?? true);
          setReduceMotion(data.reduceMotion || false);
          setLoginAlerts(data.loginAlerts ?? true);
        }
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Save to Firestore
  const saveSettings = async (updates: Record<string, any>) => {
    if (!currentUserId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUserId), updates);
      showToast('Settings saved!', 'success');
    } catch (e) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save account
  const handleSaveAccount = async () => {
    if (!displayName.trim()) return;
    await saveSettings({ displayName });
  };

  // Change password
  const handleChangePassword = async () => {
    if (!auth.currentUser || !currentPw || !newPw || !confirmPw) return;
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return; }
    if (newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    setChangingPw(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPw);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPw);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      showToast('Password updated successfully!', 'success');
    } catch (e: any) {
      showToast(e.code === 'auth/wrong-password' ? 'Current password is incorrect' : 'Failed to update password', 'error');
    } finally {
      setChangingPw(false);
    }
  };

  // Forgot password
  const handleForgotPassword = async () => {
    if (!auth.currentUser?.email) return;
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      showToast('Password reset email sent!', 'success');
    } catch (e) {
      showToast('Failed to send reset email', 'error');
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await signOut(auth);
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (!auth.currentUser || !deletePassword) return;
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, deletePassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await deleteUser(auth.currentUser);
    } catch (e: any) {
      showToast(e.code === 'auth/wrong-password' ? 'Incorrect password' : 'Failed to delete account', 'error');
    }
  };

  const tabs = [
    { key: 'account', label: 'Account', icon: User },
    { key: 'privacy', label: 'Privacy', icon: Eye },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'display', label: 'Display', icon: Monitor },
    { key: 'security', label: 'Security', icon: Shield },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn(
              'fixed top-20 left-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl',
              toast.type === 'success' ? 'bg-green-500' : 'bg-[#ef4444]'
            )}
          >
            {toast.type === 'success'
              ? <CheckCircle className="w-4 h-4 text-white shrink-0" />
              : <AlertTriangle className="w-4 h-4 text-white shrink-0" />
            }
            <p className="text-white text-sm font-bold">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 py-3">
          <h1 className="text-lg font-black text-white mb-3">Settings</h1>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                    activeTab === tab.key ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
                  )}>
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

          {/* ── Account ── */}
          {activeTab === 'account' && (
            <div>
              <SectionHeader title="Profile Information" />
              <div className="p-4 space-y-3 border-b border-[#1f1f1f]">
                <div>
                  <label className="text-xs text-[#71767b] font-semibold mb-1 block">Display Name</label>
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#71767b] font-semibold mb-1 block">Email</label>
                  <input value={email} disabled
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-sm text-[#71767b] outline-none cursor-not-allowed"
                  />
                  <p className="text-[10px] text-[#71767b] mt-1">Email cannot be changed directly</p>
                </div>
                <button onClick={handleSaveAccount} disabled={saving}
                  className="w-full py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white hover:bg-[#dc2626] transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <SectionHeader title="Account Actions" />
              <SettingRow label="Reset Password" desc="Send a password reset to your email" onClick={handleForgotPassword} />
              <SettingRow label="Download My Data" desc="Get a copy of your Arena data" onClick={() => showToast('Coming soon!', 'success')} />

              <SectionHeader title="Danger Zone" />
              <SettingRow label="Delete Account" desc="Permanently delete your account and all data" onClick={() => setShowDeleteConfirm(true)} danger />

              <div className="p-4">
                <button onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-[#ef4444]/30 rounded-full text-[#ef4444] text-sm font-bold hover:bg-[#ef4444]/10 transition-all">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>

              {/* Delete Confirm Modal */}
              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-6"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    <motion.div
                      initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                      onClick={e => e.stopPropagation()}
                      className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 w-full"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
                        <p className="font-black text-white">Delete Account</p>
                      </div>
                      <p className="text-xs text-[#71767b] mb-4 leading-relaxed">
                        This is permanent and cannot be undone. All your posts, tips, channels and data will be deleted forever.
                      </p>
                      <input type="password" placeholder="Enter your password to confirm"
                        value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
                        className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none mb-3"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-2.5 border border-[#1f1f1f] rounded-full text-sm font-bold text-[#71767b]">
                          Cancel
                        </button>
                        <button onClick={handleDeleteAccount} disabled={!deletePassword}
                          className="flex-1 py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white disabled:opacity-40">
                          Delete Forever
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Privacy ── */}
          {activeTab === 'privacy' && (
            <div>
              <SectionHeader title="Account Privacy" />
              <SettingRow label="Private Account" desc="Only approved followers can see your posts"
                toggle value={privateAccount}
                onChange={v => { setPrivateAccount(v); saveSettings({ privateAccount: v }); }}
              />
              <SettingRow label="Show Activity Status" desc="Let others see when you were last active"
                toggle value={showActivity}
                onChange={v => { setShowActivity(v); saveSettings({ showActivity: v }); }}
              />

              <SectionHeader title="Interactions" />
              <SettingRow label="Allow Direct Messages" desc="Anyone can send you messages"
                toggle value={allowMessages}
                onChange={v => { setAllowMessages(v); saveSettings({ allowMessages: v }); }}
              />
              <SettingRow label="Show Predictions Publicly" desc="Others can see your prediction history"
                toggle value={showPredictions}
                onChange={v => { setShowPredictions(v); saveSettings({ showPredictions: v }); }}
              />

              <SectionHeader title="Other" />
              <SettingRow label="Blocked Accounts" desc="Manage blocked users" onClick={() => showToast('Coming soon!', 'success')} />
              <SettingRow label="Muted Accounts" desc="Manage muted users" onClick={() => showToast('Coming soon!', 'success')} />
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <div>
              <SectionHeader title="Push Notifications" />
              <SettingRow label="Enable Push Notifications" desc="Receive notifications on your device"
                toggle value={pushNotifs}
                onChange={v => { setPushNotifs(v); saveSettings({ pushNotifs: v }); }}
              />

              <SectionHeader title="Notification Types" />
              <SettingRow label="Match Alerts" desc="Goals, results and live updates"
                toggle value={matchAlerts}
                onChange={v => { setMatchAlerts(v); saveSettings({ matchAlerts: v }); }}
              />
              <SettingRow label="Prediction Results" desc="When tips you follow are settled"
                toggle value={predictionResults}
                onChange={v => { setPredictionResults(v); saveSettings({ predictionResults: v }); }}
              />
              <SettingRow label="New Followers" desc="When someone follows you"
                toggle value={newFollowers}
                onChange={v => { setNewFollowers(v); saveSettings({ newFollowers: v }); }}
              />
              <SettingRow label="Mentions & Replies" desc="When someone mentions or replies to you"
                toggle value={mentions}
                onChange={v => { setMentions(v); saveSettings({ mentions: v }); }}
              />
              <SettingRow label="Messages" desc="New direct messages"
                toggle value={messageNotifs}
                onChange={v => { setMessageNotifs(v); saveSettings({ messageNotifs: v }); }}
              />

              <SectionHeader title="Email" />
              <SettingRow label="Email Notifications" desc="Receive updates via email"
                toggle value={emailNotifs}
                onChange={v => { setEmailNotifs(v); saveSettings({ emailNotifs: v }); }}
              />
            </div>
          )}

          {/* ── Display ── */}
          {activeTab === 'display' && (
            <div>
              <SectionHeader title="Theme" />
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setDarkMode(true)}
                    className={cn('flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                      darkMode ? 'bg-[#ef4444]/10 border-[#ef4444]/30' : 'bg-[#111] border-[#1f1f1f] hover:border-white/10'
                    )}>
                    <Moon className={cn('w-6 h-6', darkMode ? 'text-[#ef4444]' : 'text-[#71767b]')} />
                    <span className={cn('text-xs font-bold', darkMode ? 'text-[#ef4444]' : 'text-[#71767b]')}>Dark</span>
                  </button>
                  <button onClick={() => setDarkMode(false)}
                    className={cn('flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                      !darkMode ? 'bg-[#ef4444]/10 border-[#ef4444]/30' : 'bg-[#111] border-[#1f1f1f] hover:border-white/10'
                    )}>
                    <Sun className={cn('w-6 h-6', !darkMode ? 'text-[#ef4444]' : 'text-[#71767b]')} />
                    <span className={cn('text-xs font-bold', !darkMode ? 'text-[#ef4444]' : 'text-[#71767b]')}>Light</span>
                  </button>
                </div>
              </div>

              <SectionHeader title="Layout" />
              <SettingRow label="Compact Mode" desc="Show more content with smaller spacing"
                toggle value={compactMode}
                onChange={v => { setCompactMode(v); saveSettings({ compactMode: v }); }}
              />
              <SettingRow label="Autoplay Videos" desc="Videos play automatically in feed"
                toggle value={autoplayVideos}
                onChange={v => { setAutoplayVideos(v); saveSettings({ autoplayVideos: v }); }}
              />
              <SettingRow label="Reduce Motion" desc="Minimize animations throughout the app"
                toggle value={reduceMotion}
                onChange={v => { setReduceMotion(v); saveSettings({ reduceMotion: v }); }}
              />

              <SectionHeader title="Language" />
              <SettingRow label="App Language" desc="English (UK)" onClick={() => showToast('Coming soon!', 'success')} />
              <SettingRow label="Content Language" desc="English" onClick={() => showToast('Coming soon!', 'success')} />
            </div>
          )}

          {/* ── Security ── */}
          {activeTab === 'security' && (
            <div>
              <SectionHeader title="Login Security" />
              <SettingRow label="Login Alerts" desc="Get notified of new logins to your account"
                toggle value={loginAlerts}
                onChange={v => { setLoginAlerts(v); saveSettings({ loginAlerts: v }); }}
              />

              <SectionHeader title="Change Password" />
              <div className="p-4 space-y-3 border-b border-[#1f1f1f]">
                <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-xl px-4 py-2.5 transition-all">
                  <Lock className="w-4 h-4 text-[#71767b] shrink-0" />
                  <input type={showCurrentPw ? 'text' : 'password'} placeholder="Current password"
                    value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
                  />
                  <button onClick={() => setShowCurrentPw(s => !s)} className="text-[#71767b] hover:text-white">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <input type="password" placeholder="New password" value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                />
                <input type="password" placeholder="Confirm new password" value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                />
                <button onClick={handleChangePassword}
                  disabled={changingPw || !currentPw || !newPw || !confirmPw}
                  className="w-full py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white hover:bg-[#dc2626] transition-colors disabled:opacity-40">
                  {changingPw ? 'Updating...' : 'Update Password'}
                </button>
                <button onClick={handleForgotPassword}
                  className="w-full text-xs text-[#ef4444] hover:underline">
                  Forgot password? Send reset email
                </button>
              </div>

              <SectionHeader title="Danger" />
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <div className="flex items-start gap-3 p-3 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-white">Delete Account</p>
                    <p className="text-xs text-[#71767b] mt-0.5 mb-2">
                      This action is permanent and cannot be undone. All your data will be deleted.
                    </p>
                    <button onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-1.5 text-xs text-[#ef4444] font-bold hover:underline">
                      <Trash2 className="w-3 h-3" />
                      Permanently Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
