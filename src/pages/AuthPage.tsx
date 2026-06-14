import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, Eye, EyeOff,
  ArrowRight, Check, ChevronLeft, Trophy,
  Zap, RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';

type Mode = 'landing' | 'signin' | 'signup' | 'tipster' | 'verify' | 'forgot';

interface AuthPageProps {
  onComplete: () => void;
}

const sports = ['Football', 'Basketball', 'Tennis', 'Cricket', 'Rugby', 'Baseball', 'MMA', 'F1'];

export function AuthPage({ onComplete }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>('landing');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [tipsterStep, setTipsterStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    bio: '', channelName: '',
  });

  const update = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const toggleSport = (sport: string) =>
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );

  const clearMessages = () => { setError(''); setSuccess(''); };

  // ── Google Sign In ────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true);
    clearMessages();
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          displayName: user.displayName || 'User',
          email: user.email,
          role: 'user',
          verified: false,
          walletBalance: 0,
          winRate: 0,
          tipsCount: 0,
          followersCount: 0,
          paidChannelEligible: false,
          createdAt: serverTimestamp(),
        });
      }
      onComplete();
    } catch (e: any) {
      setError('Google sign in failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Sign In ───────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!form.email || !form.password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    clearMessages();
    try {
      const result = await signInWithEmailAndPassword(auth, form.email, form.password);
      if (!result.user.emailVerified) {
        setVerifyEmail(form.email);
        setMode('verify');
        return;
      }
      onComplete();
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (e.code === 'auth/too-many-requests') {
        setError('Too many attempts. Try again later.');
      } else {
        setError('Sign in failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ───────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!form.name || !form.email || !form.password) { setError('Please fill in all fields'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    clearMessages();
    try {
      const result = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await sendEmailVerification(result.user);
      await setDoc(doc(db, 'users', result.user.uid), {
        displayName: form.name.trim(),
        email: form.email,
        role: 'user',
        verified: false,
        walletBalance: 0,
        winRate: 0,
        tipsCount: 0,
        followersCount: 0,
        paidChannelEligible: false,
        createdAt: serverTimestamp(),
      });
      setVerifyEmail(form.email);
      setMode('verify');
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (e.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (e.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError('Sign up failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Tipster Registration ──────────────────────────────────────────────
  const handleTipsterSignUp = async () => {
    if (!form.name || !form.email || !form.password) { setError('Please fill in all fields'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (selectedSports.length === 0) { setError('Please select at least one sport'); return; }
    if (!form.channelName) { setError('Please enter a channel name'); return; }
    setLoading(true);
    clearMessages();
    try {
      const result = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await sendEmailVerification(result.user);
      await setDoc(doc(db, 'users', result.user.uid), {
        displayName: form.name.trim(),
        email: form.email,
        role: 'tipster',
        verified: false,
        walletBalance: 0,
        winRate: 0,
        tipsCount: 0,
        followersCount: 0,
        paidChannelEligible: false,
        sports: selectedSports,
        channelName: form.channelName,
        bio: form.bio,
        createdAt: serverTimestamp(),
      });
      setVerifyEmail(form.email);
      setMode('verify');
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else {
        setError('Registration failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Resend Verification ───────────────────────────────────────────────
  const handleResendVerification = async () => {
    setResendLoading(true);
    clearMessages();
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setSuccess('Verification email sent! Check your inbox and spam folder.');
      } else {
        // Sign in silently to get user object
        const result = await signInWithEmailAndPassword(auth, verifyEmail, form.password);
        await sendEmailVerification(result.user);
        setSuccess('Verification email sent! Check your inbox and spam folder.');
      }
    } catch (e) {
      setError('Failed to send email. Wait a minute and try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // ── Forgot Password ───────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!form.email) { setError('Please enter your email address'); return; }
    setLoading(true);
    clearMessages();
    try {
      await sendPasswordResetEmail(auth, form.email);
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else {
        setError('Failed to send reset email. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Check Verification ────────────────────────────────────────────────
  const handleCheckVerification = async () => {
    setLoading(true);
    clearMessages();
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          onComplete();
        } else {
          setError('Email not verified yet. Check your inbox and spam folder.');
        }
      } else {
        setError('Please sign in again to verify.');
      }
    } catch (e) {
      setError('Verification check failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared UI Components ──────────────────────────────────────────────
  const Input = ({
    icon: Icon, placeholder, value, onChange, type = 'text', rightElement
  }: {
    icon: any; placeholder: string; value: string;
    onChange: (v: string) => void; type?: string; rightElement?: React.ReactNode;
  }) => (
    <div className="flex items-center gap-3 bg-[#111] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-2xl px-4 py-3.5 transition-all">
      <Icon className="w-4 h-4 text-[#71767b] shrink-0" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
      />
      {rightElement}
    </div>
  );

  const Button = ({ label, onClick, disabled, variant = 'primary' }: {
    label: string; onClick: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'google';
  }) => (
    <button onClick={onClick} disabled={disabled}
      className={cn('w-full py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2',
        variant === 'primary' && 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white shadow-lg shadow-red-500/20 hover:opacity-90',
        variant === 'secondary' && 'bg-[#111] border border-[#1f1f1f] text-white hover:border-white/20',
        variant === 'google' && 'bg-white text-black hover:bg-white/90',
      )}>
      {disabled ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : label}
    </button>
  );

  // ── Landing ───────────────────────────────────────────────────────────
  if (mode === 'landing') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
            {/* Logo */}
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-gradient-to-br from-[#dc2626] to-[#ef4444] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-red-500/30">
                <Zap className="w-8 h-8 text-white fill-white" />
              </div>
              <h1 className="text-3xl font-black text-white mb-2">Arena</h1>
              <p className="text-[#71767b] text-sm leading-relaxed">
                The home of sports predictions.{'\n'}Follow top tipsters. Win big.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="space-y-3">
              <button onClick={handleGoogle} disabled={loading}
                className="w-full py-3.5 bg-white rounded-2xl text-sm font-bold text-black hover:bg-white/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <button onClick={() => setMode('signup')}
                className="w-full py-3.5 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-2xl text-sm font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-red-500/20">
                Create Account
              </button>

              <button onClick={() => setMode('signin')}
                className="w-full py-3.5 bg-[#111] border border-[#1f1f1f] rounded-2xl text-sm font-bold text-white hover:border-white/20 transition-all">
                Sign In
              </button>
            </div>

            {/* Tipster CTA */}
            <button onClick={() => setMode('tipster')}
              className="w-full mt-4 flex items-center justify-between px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl group hover:border-yellow-500/40 transition-all">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">Become a Tipster</span>
              </div>
              <ArrowRight className="w-4 h-4 text-yellow-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-center text-xs text-[#71767b] mt-6 leading-relaxed">
              By continuing you agree to our{' '}
              <span className="text-white">Terms of Service</span> and{' '}
              <span className="text-white">Privacy Policy</span>
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Sign In ───────────────────────────────────────────────────────────
  if (mode === 'signin') {
    return (
      <div className="min-h-screen bg-black flex flex-col px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mx-auto">
          <button onClick={() => { setMode('landing'); clearMessages(); }}
            className="flex items-center gap-1 text-[#71767b] hover:text-white mb-8 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <h2 className="text-2xl font-black text-white mb-1">Welcome back</h2>
          <p className="text-[#71767b] text-sm mb-8">Sign in to your Arena account</p>

          <div className="space-y-3 mb-6">
            <Input icon={Mail} placeholder="Email address" value={form.email} onChange={v => update('email', v)} type="email" />
            <Input icon={Lock} placeholder="Password" value={form.password} onChange={v => update('password', v)}
              type={showPassword ? 'text' : 'password'}
              rightElement={
                <button onClick={() => setShowPassword(s => !s)} className="text-[#71767b] hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
          </div>

          <button onClick={() => setMode('forgot')} className="text-xs text-[#ef4444] font-semibold mb-6 block">
            Forgot password?
          </button>

          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-[#ef4444]">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button label="Sign In" onClick={handleSignIn} disabled={loading} />
            <Button label="Continue with Google" onClick={handleGoogle} disabled={loading} variant="google" />
          </div>

          <p className="text-center text-sm text-[#71767b] mt-6">
            Don't have an account?{' '}
            <button onClick={() => { setMode('signup'); clearMessages(); }} className="text-[#ef4444] font-bold">
              Sign up
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Sign Up ───────────────────────────────────────────────────────────
  if (mode === 'signup') {
    return (
      <div className="min-h-screen bg-black flex flex-col px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mx-auto">
          <button onClick={() => { setMode('landing'); clearMessages(); }}
            className="flex items-center gap-1 text-[#71767b] hover:text-white mb-8 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <h2 className="text-2xl font-black text-white mb-1">Create account</h2>
          <p className="text-[#71767b] text-sm mb-8">Join Arena and follow top tipsters</p>

          <div className="space-y-3 mb-6">
            <Input icon={User} placeholder="Full name" value={form.name} onChange={v => update('name', v)} />
            <Input icon={Mail} placeholder="Email address" value={form.email} onChange={v => update('email', v)} type="email" />
            <Input icon={Lock} placeholder="Password (min 6 characters)" value={form.password} onChange={v => update('password', v)}
              type={showPassword ? 'text' : 'password'}
              rightElement={
                <button onClick={() => setShowPassword(s => !s)} className="text-[#71767b] hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
          </div>

          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-[#ef4444]">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button label="Create Account" onClick={handleSignUp} disabled={loading} />
            <Button label="Continue with Google" onClick={handleGoogle} disabled={loading} variant="google" />
          </div>

          <p className="text-center text-sm text-[#71767b] mt-6">
            Already have an account?{' '}
            <button onClick={() => { setMode('signin'); clearMessages(); }} className="text-[#ef4444] font-bold">
              Sign in
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Tipster Registration ──────────────────────────────────────────────
  if (mode === 'tipster') {
    return (
      <div className="min-h-screen bg-black flex flex-col px-6 py-12 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mx-auto">
          <button onClick={() => { setMode('landing'); clearMessages(); setTipsterStep(1); }}
            className="flex items-center gap-1 text-[#71767b] hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map(step => (
              <div key={step} className={cn('h-1 flex-1 rounded-full transition-all',
                tipsterStep >= step ? 'bg-[#ef4444]' : 'bg-[#1f1f1f]'
              )} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1 — Basic info */}
            {tipsterStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#ef4444]/10 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-[#ef4444]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Tipster Account</h2>
                    <p className="text-xs text-[#71767b]">Step 1 of 3 — Basic information</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <Input icon={User} placeholder="Full name" value={form.name} onChange={v => update('name', v)} />
                  <Input icon={Mail} placeholder="Email address" value={form.email} onChange={v => update('email', v)} type="email" />
                  <Input icon={Lock} placeholder="Password (min 6 characters)" value={form.password} onChange={v => update('password', v)}
                    type={showPassword ? 'text' : 'password'}
                    rightElement={
                      <button onClick={() => setShowPassword(s => !s)} className="text-[#71767b] hover:text-white">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                </div>

                {error && (
                  <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3 mb-4">
                    <p className="text-xs text-[#ef4444]">{error}</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (!form.name || !form.email || !form.password) { setError('Please fill in all fields'); return; }
                    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
                    clearMessages();
                    setTipsterStep(2);
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step 2 — Sports */}
            {tipsterStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-6">
                  <h2 className="text-xl font-black text-white mb-1">Your Sports</h2>
                  <p className="text-sm text-[#71767b]">Step 2 of 3 — Select sports you specialise in</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-6">
                  {sports.map(sport => (
                    <button key={sport} onClick={() => toggleSport(sport)}
                      className={cn('flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-bold transition-all',
                        selectedSports.includes(sport)
                          ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-white'
                          : 'bg-[#111] border-[#1f1f1f] text-[#71767b] hover:border-white/10'
                      )}>
                      {sport}
                      {selectedSports.includes(sport) && <Check className="w-4 h-4 text-[#ef4444]" />}
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3 mb-4">
                    <p className="text-xs text-[#ef4444]">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => { setTipsterStep(1); clearMessages(); }}
                    className="flex-1 py-3.5 bg-[#111] border border-[#1f1f1f] rounded-2xl text-sm font-bold text-white">
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (selectedSports.length === 0) { setError('Select at least one sport'); return; }
                      clearMessages();
                      setTipsterStep(3);
                    }}
                    className="flex-1 py-3.5 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3 — Channel */}
            {tipsterStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-6">
                  <h2 className="text-xl font-black text-white mb-1">Your Channel</h2>
                  <p className="text-sm text-[#71767b]">Step 3 of 3 — Set up your tipster channel</p>
                </div>

                <div className="space-y-3 mb-6">
                  <Input icon={Trophy} placeholder="Channel name (e.g. Gold Tipster)" value={form.channelName} onChange={v => update('channelName', v)} />
                  <div className="bg-[#111] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-2xl px-4 py-3.5 transition-all">
                    <textarea
                      placeholder="Brief bio (optional)"
                      value={form.bio}
                      onChange={e => update('bio', e.target.value)}
                      rows={3}
                      className="w-full bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 mb-6">
                  <p className="text-xs font-bold text-white mb-2">Account Summary</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs text-[#71767b]">Name</span>
                      <span className="text-xs text-white font-semibold">{form.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#71767b]">Sports</span>
                      <span className="text-xs text-white font-semibold">{selectedSports.slice(0, 3).join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#71767b]">Role</span>
                      <span className="text-xs text-[#ef4444] font-bold">Tipster</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3 mb-4">
                    <p className="text-xs text-[#ef4444]">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => { setTipsterStep(2); clearMessages(); }}
                    className="flex-1 py-3.5 bg-[#111] border border-[#1f1f1f] rounded-2xl text-sm font-bold text-white">
                    Back
                  </button>
                  <button onClick={handleTipsterSignUp} disabled={loading}
                    className="flex-1 py-3.5 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-2xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center">
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Account 🚀'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // ── Email Verification ────────────────────────────────────────────────
  if (mode === 'verify') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-[#ef4444]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-[#ef4444]" />
          </div>

          <h2 className="text-2xl font-black text-white mb-2">Check your email</h2>
          <p className="text-[#71767b] text-sm mb-2 leading-relaxed">
            We sent a verification link to
          </p>
          <p className="text-white font-bold text-sm mb-6">{verifyEmail}</p>

          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 mb-6 text-left space-y-2">
            <p className="text-xs font-bold text-white">What to do:</p>
            {[
              'Open your email inbox',
              'Look for an email from Arena / Firebase',
              'Check your spam folder too',
              'Click the verification link',
              'Come back and press the button below',
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#ef4444]/20 flex items-center justify-center shrink-0">
                  <span className="text-[9px] text-[#ef4444] font-black">{i + 1}</span>
                </div>
                <p className="text-xs text-[#71767b]">{step}</p>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-[#ef4444]">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-green-400">{success}</p>
            </div>
          )}

          <div className="space-y-3">
            <button onClick={handleCheckVerification} disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-2xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-all">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Check className="w-4 h-4" /> I've verified my email</>
              }
            </button>

            <button onClick={handleResendVerification} disabled={resendLoading}
              className="w-full py-3.5 bg-[#111] border border-[#1f1f1f] rounded-2xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 hover:border-white/20 transition-all">
              {resendLoading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><RefreshCw className="w-4 h-4" /> Resend verification email</>
              }
            </button>

            <button onClick={() => { setMode('signin'); clearMessages(); }}
              className="text-sm text-[#71767b] hover:text-white transition-colors">
              Back to sign in
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Forgot Password ───────────────────────────────────────────────────
  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <button onClick={() => { setMode('signin'); clearMessages(); }}
            className="flex items-center gap-1 text-[#71767b] hover:text-white mb-8 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back to sign in</span>
          </button>

          <h2 className="text-2xl font-black text-white mb-1">Reset password</h2>
          <p className="text-[#71767b] text-sm mb-8">Enter your email and we'll send a reset link</p>

          <div className="mb-6">
            <Input icon={Mail} placeholder="Email address" value={form.email} onChange={v => update('email', v)} type="email" />
          </div>

          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-[#ef4444]">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-green-400">{success}</p>
            </div>
          )}

          <Button label="Send Reset Link" onClick={handleForgotPassword} disabled={loading} />
        </motion.div>
      </div>
    );
  }

  return null;
}
