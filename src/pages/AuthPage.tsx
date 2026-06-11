import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Lock, User, Eye, EyeOff,
  ArrowRight, Zap, Trophy, ChevronRight, Check
} from 'lucide-react';
import { cn } from '../lib/utils';

type Mode = 'landing' | 'signin' | 'signup' | 'tipster' | 'verify';

interface AuthPageProps {
  onComplete: () => void;
}

const sports = ['Football', 'Basketball', 'Tennis', 'Cricket', 'Rugby', 'Baseball', 'MMA', 'F1'];

const perks = [
  'Create paid & free prediction channels',
  'Post official match tickets with codes',
  'Earn from paid channel subscriptions',
  'Verified tipster badge on your profile',
  'Access to tipster analytics dashboard',
  'Featured on the leaderboard',
];

export function AuthPage({ onComplete }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>('landing');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [tipsterStep, setTipsterStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    bio: '', experience: '', channelName: '',
  });

  const update = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const toggleSport = (sport: string) =>
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          role: 'user',
          followersCount: 0,
          followingCount: 0,
          tipsCount: 0,
          winRate: 0,
          verified: false,
          paidChannelEligible: false,
          walletBalance: 0,
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

  // Email Sign In
  const handleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const { user } = await signInWithEmailAndPassword(auth, form.email, form.password);
      if (!user.emailVerified) {
        setError('Please verify your email first. Check your inbox.');
        setLoading(false);
        return;
      }
      onComplete();
    } catch (e: any) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Regular Sign Up
  const handleSignUp = async () => {
    setLoading(true);
    setError('');
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: form.name,
        email: form.email,
        role: 'user',
        followersCount: 0,
        followingCount: 0,
        tipsCount: 0,
        winRate: 0,
        verified: false,
        paidChannelEligible: false,
        walletBalance: 0,
        createdAt: serverTimestamp(),
      });
      await sendEmailVerification(user);
      setVerifyEmail(form.email);
      setMode('verify');
    } catch (e: any) {
      setError('Signup failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Tipster Sign Up
  const handleTipsterSignUp = async () => {
    setLoading(true);
    setError('');
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: form.name,
        email: form.email,
        role: 'tipster',
        channelName: form.channelName,
        bio: form.bio,
        experience: form.experience,
        sports: selectedSports,
        followersCount: 0,
        followingCount: 0,
        tipsCount: 0,
        winRate: 0,
        verified: false,
        paidChannelEligible: false,
        walletBalance: 0,
        createdAt: serverTimestamp(),
      });
      await sendEmailVerification(user);
      setVerifyEmail(form.email);
      setMode('verify');
    } catch (e: any) {
      setError('Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-black">

      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/auth-bg.jpg')] bg-cover bg-center opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
      </div>

      {/* Logo top left */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-[#ef4444]">
          <img src="/logo.jpg" alt="Arena" className="w-full h-full object-cover" />
        </div>
        <span className="text-white font-black text-lg">Arena</span>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4 my-8">
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl px-6 py-8">
          <AnimatePresence mode="wait">

            {/* ── LANDING ── */}
            {mode === 'landing' && (
              <motion.div
                key="landing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[#ef4444] shadow-lg shadow-red-500/30">
                  <img src="/logo.jpg" alt="Arena" className="w-full h-full object-cover" />
                </div>

                <div className="text-center">
                  <h1 className="text-3xl font-black text-white">Welcome to Arena</h1>
                  <p className="text-sm text-white/50 mt-1">The home of sports fans worldwide</p>
                </div>

                {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-sm py-3 rounded-full hover:bg-white/90 transition-all disabled:opacity-50"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                  {loading ? 'Signing in...' : 'Continue with Google'}
                </button>

                <button className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-sm py-3 rounded-full hover:bg-white/90 transition-all">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="black">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Continue with Apple
                </button>

                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-white/30">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <button
                  onClick={() => setMode('signup')}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3 rounded-full hover:opacity-90 transition-all shadow-lg shadow-red-500/30"
                >
                  Create Account <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setMode('tipster')}
                  className="w-full flex items-center justify-center gap-2 border border-[#ef4444]/30 text-[#ef4444] font-bold text-sm py-3 rounded-full hover:bg-[#ef4444]/10 transition-all"
                >
                  <Trophy className="w-4 h-4" />
                  Register as Tipster
                </button>

                <p className="text-[11px] text-white/30 text-center leading-relaxed px-2">
                  By signing up, you agree to our{' '}
                  <span className="text-white/50 underline cursor-pointer">Terms</span>,{' '}
                  <span className="text-white/50 underline cursor-pointer">Privacy Policy</span> and{' '}
                  <span className="text-white/50 underline cursor-pointer">Cookie Policy</span>.
                </p>

                <div className="pt-1 border-t border-white/10 w-full text-center">
                  <p className="text-sm text-white/40">
                    Already have an account?{' '}
                    <button onClick={() => setMode('signin')} className="text-[#ef4444] font-bold hover:underline">
                      Sign in
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── EMAIL VERIFICATION ── */}
            {mode === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center gap-4 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-[#ef4444]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white mb-2">Verify your email</h2>
                  <p className="text-sm text-white/50">We sent a verification link to</p>
                  <p className="text-sm text-[#ef4444] font-bold mt-1">{verifyEmail}</p>
                  <p className="text-sm text-white/50 mt-2">Click the link in your email to activate your account.</p>
                </div>
                <button
                  onClick={() => setMode('signin')}
                  className="w-full bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3 rounded-full hover:opacity-90 transition-all"
                >
                  I've verified — Sign In
                </button>
                <p className="text-xs text-white/30">
                  Didn't get it?{' '}
                  <button
                    onClick={async () => {
                      const user = auth.currentUser;
                      if (user) await sendEmailVerification(user);
                    }}
                    className="text-[#ef4444] underline"
                  >
                    Resend email
                  </button>
                </p>
              </motion.div>
            )}

            {/* ── SIGN IN ── */}
            {mode === 'signin' && (
              <motion.div
                key="signin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <button onClick={() => setMode('landing')} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors mb-5">
                  <X className="w-4 h-4 text-white/60" />
                </button>

                <h2 className="text-2xl font-black text-white mb-1">Sign in</h2>
                <p className="text-sm text-white/40 mb-6">Welcome back to Arena 👋</p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-[#ef4444]/50 rounded-xl px-3 py-3 transition-all">
                    <Mail className="w-4 h-4 text-white/30 shrink-0" />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-[#ef4444]/50 rounded-xl px-3 py-3 transition-all">
                    <Lock className="w-4 h-4 text-white/30 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={form.password}
                      onChange={e => update('password', e.target.value)}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                    />
                    <button onClick={() => setShowPassword(s => !s)} className="text-white/30 hover:text-white/60">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="text-right">
                    <button className="text-xs text-[#ef4444] hover:underline">Forgot password?</button>
                  </div>

                  {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                  <button
                    onClick={handleSignIn}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3 rounded-full hover:opacity-90 transition-all shadow-lg shadow-red-500/30 disabled:opacity-50"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>

                <p className="text-sm text-white/40 text-center">
                  Don't have an account?{' '}
                  <button onClick={() => setMode('signup')} className="text-[#ef4444] font-bold hover:underline">
                    Sign up
                  </button>
                </p>
              </motion.div>
            )}

            {/* ── SIGN UP ── */}
            {mode === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <button onClick={() => setMode('landing')} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors mb-5">
                  <X className="w-4 h-4 text-white/60" />
                </button>

                <h2 className="text-2xl font-black text-white mb-1">Create account</h2>
                <p className="text-sm text-white/40 mb-6">Join the Arena community 🏟️</p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-[#ef4444]/50 rounded-xl px-3 py-3 transition-all">
                    <User className="w-4 h-4 text-white/30 shrink-0" />
                    <input
                      type="text"
                      placeholder="Full name"
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-[#ef4444]/50 rounded-xl px-3 py-3 transition-all">
                    <Mail className="w-4 h-4 text-white/30 shrink-0" />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-[#ef4444]/50 rounded-xl px-3 py-3 transition-all">
                    <Lock className="w-4 h-4 text-white/30 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create password"
                      value={form.password}
                      onChange={e => update('password', e.target.value)}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                    />
                    <button onClick={() => setShowPassword(s => !s)} className="text-white/30 hover:text-white/60">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                  <button
                    onClick={handleSignUp}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3 rounded-full hover:opacity-90 transition-all shadow-lg shadow-red-500/30 disabled:opacity-50"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>
                </div>

                <p className="text-[11px] text-white/30 text-center leading-relaxed">
                  By signing up you agree to our{' '}
                  <span className="text-white/50 underline cursor-pointer">Terms</span>,{' '}
                  <span className="text-white/50 underline cursor-pointer">Privacy Policy</span> and{' '}
                  <span className="text-white/50 underline cursor-pointer">Cookie Policy</span>.
                </p>

                <p className="text-sm text-white/40 text-center mt-3">
                  Already have an account?{' '}
                  <button onClick={() => setMode('signin')} className="text-[#ef4444] font-bold hover:underline">
                    Sign in
                  </button>
                </p>
              </motion.div>
            )}

            {/* ── TIPSTER ── */}
            {mode === 'tipster' && (
              <motion.div
                key="tipster"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <button onClick={() => setMode('landing')} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors mb-4">
                  <X className="w-4 h-4 text-white/60" />
                </button>

                <div className="flex items-center gap-2 mb-5">
                  {[1, 2, 3].map(s => (
                    <div key={s} className={cn('h-1 flex-1 rounded-full transition-all', s <= tipsterStep ? 'bg-[#ef4444]' : 'bg-white/10')} />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {tipsterStep === 1 && (
                    <motion.div key="ts1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-5 h-5 text-[#ef4444]" />
                        <h2 className="text-xl font-black text-white">Become a Tipster</h2>
                      </div>
                      <p className="text-sm text-white/40 mb-4">Share your expertise and earn from predictions</p>
                      <div className="space-y-2 mb-4">
                        {perks.map((perk, i) => (
                          <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-white/5 last:border-0">
                            <div className="w-5 h-5 rounded-full bg-[#ef4444]/20 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-[#ef4444]" />
                            </div>
                            <p className="text-sm text-white/70">{perk}</p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-3 mb-4">
                        <p className="text-xs text-[#ef4444] font-semibold">⚠️ Tipster Code of Conduct</p>
                        <p className="text-xs text-white/50 mt-1 leading-relaxed">
                          Tipsters must post honest predictions only. Misleading or fraudulent tickets will result in a permanent ban.
                        </p>
                      </div>
                      <button onClick={() => setTipsterStep(2)}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3 rounded-full hover:opacity-90 transition-all">
                        I Agree — Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}

                  {tipsterStep === 2 && (
                    <motion.div key="ts2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <h2 className="text-xl font-black text-white mb-1">Your Speciality</h2>
                      <p className="text-sm text-white/40 mb-4">Select the sports you specialise in</p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {sports.map(sport => (
                          <button key={sport} onClick={() => toggleSport(sport)}
                            className={cn('py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all text-left',
                              selectedSports.includes(sport) ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444]' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                            )}>
                            {selectedSports.includes(sport) && <Check className="w-3 h-3 inline mr-1" />}
                            {sport}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-3 mb-4">
                        <textarea placeholder="Brief bio — tell users about yourself..."
                          value={form.bio} onChange={e => update('bio', e.target.value)} rows={3}
                          className="w-full bg-white/5 border border-white/10 focus:border-[#ef4444]/50 rounded-xl px-3 py-3 text-sm text-white placeholder:text-white/30 outline-none resize-none transition-all"
                        />
                        <input type="text" placeholder="Years of experience (e.g. 3 years)"
                          value={form.experience} onChange={e => update('experience', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 focus:border-[#ef4444]/50 rounded-xl px-3 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all"
                        />
                      </div>
                      <button onClick={() => setTipsterStep(3)} disabled={selectedSports.length === 0}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3 rounded-full hover:opacity-90 transition-all disabled:opacity-40">
                        Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}

                  {tipsterStep === 3 && (
                    <motion.div key="ts3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <h2 className="text-xl font-black text-white mb-1">Account Details</h2>
                      <p className="text-sm text-white/40 mb-4">Create your tipster account</p>
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-[#ef4444]/50 rounded-xl px-3 py-3 transition-all">
                          <User className="w-4 h-4 text-white/30 shrink-0" />
                          <input type="text" placeholder="Full name" value={form.name} onChange={e => update('name', e.target.value)}
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none" />
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-[#ef4444]/50 rounded-xl px-3 py-3 transition-all">
                          <Mail className="w-4 h-4 text-white/30 shrink-0" />
                          <input type="email" placeholder="Email address" value={form.email} onChange={e => update('email', e.target.value)}
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none" />
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-[#ef4444]/50 rounded-xl px-3 py-3 transition-all">
                          <Zap className="w-4 h-4 text-white/30 shrink-0" />
                          <input type="text" placeholder="Channel name (e.g. GoldTips VIP)" value={form.channelName} onChange={e => update('channelName', e.target.value)}
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none" />
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-[#ef4444]/50 rounded-xl px-3 py-3 transition-all">
                          <Lock className="w-4 h-4 text-white/30 shrink-0" />
                          <input type={showPassword ? 'text' : 'password'} placeholder="Create password" value={form.password} onChange={e => update('password', e.target.value)}
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none" />
                          <button onClick={() => setShowPassword(s => !s)} className="text-white/30 hover:text-white/60">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {error && <p className="text-red-400 text-xs text-center mb-2">{error}</p>}
                      <button onClick={handleTipsterSignUp} disabled={loading}
                        className="w-full bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3 rounded-full hover:opacity-90 transition-all shadow-lg shadow-red-500/30 disabled:opacity-50">
                        {loading ? 'Submitting...' : 'Submit Application'}
                      </button>
                      <p className="text-[11px] text-white/30 text-center mt-3 leading-relaxed">
                        Your application will be reviewed within 24-48 hours.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
