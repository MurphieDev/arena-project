import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, Zap, Trophy,
  ChevronRight, Check, ArrowLeft, AlertCircle, Loader2,
  Star, TrendingUp, Shield, Users
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../auth/hooks/AuthContext';
import { db } from '../../lib/firebase';
import { collection, getDocs, query as firestoreQuery, where, orderBy, limit } from 'firebase/firestore';

// ── Types ────────────────────────────────────────────────────────────────────
type Mode = 'landing' | 'signin' | 'signup' | 'tipster';

// ── Constants ────────────────────────────────────────────────────────────────
const SPORTS = ['⚽ Football', '🏀 Basketball', '🎾 Tennis', '🏏 Cricket', '🏉 Rugby', '⚾ Baseball', '🥊 MMA', '🏎️ Formula 1', '🏐 Volleyball', '🏒 Ice Hockey'];

const PERKS = [
  { icon: Zap, text: 'Create paid & free prediction channels' },
  { icon: Trophy, text: 'Post official match tickets with codes' },
  { icon: TrendingUp, text: 'Earn from paid channel subscriptions' },
  { icon: Shield, text: 'Verified tipster badge on your profile' },
  { icon: Star, text: 'Access to tipster analytics dashboard' },
  { icon: Users, text: 'Featured on the leaderboard' },
];

const STATS = [
  { value: '2.4M+', label: 'Active Fans' },
  { value: '98K+', label: 'Predictions' },
  { value: '1.2K+', label: 'Top Tipsters' },
  { value: '94%', label: 'Win Rate Top' },
];

const DEFAULT_PROOF = [
  { name: 'Top Tipster', handle: '@arena', win: '14W-2L', sport: '⚽' },
  { name: 'Best Picks', handle: '@arena', win: '9W-1L', sport: '🏀' },
  { name: 'Pro Tips', handle: '@arena', win: '7W-0L', sport: '🏎️' },
];

// ── Animation Variants ────────────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

// ── Input Component ───────────────────────────────────────────────────────────
interface InputProps {
  icon: React.ElementType;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  suffix?: React.ReactNode;
  autoComplete?: string;
}

function FloatingInput({ icon: Icon, type = 'text', placeholder, value, onChange, error, suffix, autoComplete }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <div className={cn(
        'flex items-center gap-3 rounded-2xl px-4 py-3.5 border transition-all duration-200',
        focused
          ? 'bg-white/8 border-[#ef4444]/60 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
          : error
            ? 'bg-white/5 border-red-500/40'
            : 'bg-white/5 border-white/10 hover:border-white/20'
      )}>
        <Icon className={cn('w-4 h-4 shrink-0 transition-colors', focused ? 'text-[#ef4444]' : 'text-white/30')} />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
        />
        {suffix}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5 ml-1"
        >
          <AlertCircle className="w-3 h-3" /> {error}
        </motion.p>
      )}
    </div>
  );
}

// ── Social Button ─────────────────────────────────────────────────────────────
function SocialButton({ icon, label, onClick, loading }: { icon: React.ReactNode; label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-sm py-3 rounded-2xl transition-all duration-200 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

// ── Left Branding Panel ───────────────────────────────────────────────────────
function BrandingPanel() {
  const [activeProof, setActiveProof] = useState(0);
  const [socialProof, setSocialProof] = useState(DEFAULT_PROOF);

  useEffect(() => {
    // Load real top tipsters
    getDocs(
      firestoreQuery(collection(db, 'users'), where('role', '==', 'tipster'), orderBy('winRate', 'desc'), limit(3))
    ).then(snap => {
      if (snap.size > 0) {
        const tipsters = snap.docs.map(d => {
          const data = d.data();
          const sport = data.sports?.[0] === 'Football' ? '⚽' : data.sports?.[0] === 'Basketball' ? '🏀' : data.sports?.[0] === 'F1' ? '🏎️' : '🎯';
          return {
            name: data.displayName || 'Tipster',
            handle: `@${(data.displayName || '').toLowerCase().replace(/\s/g, '')}`,
            win: `${data.winRate || 0}% WR`,
            sport,
          };
        });
        setSocialProof(tipsters);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setActiveProof(p => (p + 1) % socialProof.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden lg:flex flex-col justify-between h-full p-10 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#ef4444]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#dc2626]/10 blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-[#ef4444]/40">
          <img src="/logo.jpg" alt="Arena" className="w-full h-full object-cover" />
        </div>
        <span className="text-white font-black text-xl tracking-tight">Arena</span>
      </div>

      {/* Hero text */}
      <div className="relative z-10 space-y-6">
        <div>
          <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight">
            The home of<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ef4444] to-[#f87171]">sports fans</span><br />
            worldwide.
          </h1>
          <p className="mt-4 text-white/50 text-base leading-relaxed max-w-xs">
            Join predictions, follow elite tipsters, and experience sports like never before.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {STATS.map(s => (
            <div key={s.label} className="bg-white/5 border border-white/8 rounded-2xl p-4">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Social proof carousel */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 overflow-hidden">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3 font-semibold">Top Tipsters This Week</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeProof}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ef4444] to-[#dc2626] flex items-center justify-center text-white font-black text-sm">
                  {socialProof[activeProof % socialProof.length]?.sport}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{socialProof[activeProof % socialProof.length]?.name}</p>
                  <p className="text-white/40 text-xs">{socialProof[activeProof % socialProof.length]?.handle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-black text-sm">{socialProof[activeProof % socialProof.length]?.win}</p>
                <p className="text-white/30 text-xs">This week</p>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-1 mt-3">
            {socialProof.map((_, i) => (
              <div key={i} className={cn('h-0.5 flex-1 rounded-full transition-all duration-300', i === activeProof ? 'bg-[#ef4444]' : 'bg-white/10')} />
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-white/20 relative z-10">© 2025 Arena. All rights reserved.</p>
    </div>
  );
}

// ── Main AuthPage ─────────────────────────────────────────────────────────────
export function AuthPage() {
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('landing');
  const [direction, setDirection] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [tipsterStep, setTipsterStep] = useState(1);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    bio: '', experience: '', channelName: '',
  });

  const update = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  const toggleSport = (sport: string) =>
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );

  const goTo = (m: Mode, dir = 1) => {
    setDirection(dir);
    setMode(m);
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateSignIn = () => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateSignUp = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'At least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!policyAccepted) e.policyAccepted = 'You must agree to the Terms and Privacy Policy';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!validateSignIn()) return;
    try {
      setLoading(true);
      await login(form.email, form.password);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrors({ password: 'Invalid email or password' });
      } else if (err.code === 'auth/too-many-requests') {
        setErrors({ general: 'Too many attempts. Please try again later.' });
      } else {
        setErrors({ general: err.message || 'Sign in failed. Try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateSignUp()) return;
    try {
      setLoading(true);
      await signup(form.email, form.password, form.name, 'user', policyAccepted, policyAccepted, 'v1.0');
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setErrors({ email: 'An account with this email already exists' });
      } else if (err.code === 'auth/invalid-email') {
        setErrors({ email: 'Invalid email address' });
      } else if (err.code === 'auth/weak-password') {
        setErrors({ password: 'Password is too weak' });
      } else {
        setErrors({ general: err.message || 'Sign up failed. Try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      if (provider === 'google') {
        await loginWithGoogle();
        navigate('/');
      } else {
        // Apple login not yet supported
        setErrors({ general: 'Apple login coming soon. Use Google or email.' });
      }
    } catch (err: any) {
      setErrors({ general: err.message || `${provider} login failed. Try another method.` });
    } finally {
      setSocialLoading(null);
    }
  };

  const handleTipsterSubmit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.channelName.trim()) e.channelName = 'Channel name is required';
    if (!form.password || form.password.length < 8) e.password = 'At least 8 characters';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    try {
      setLoading(true);
      await signup(
        form.email,
        form.password,
        form.name,
        'tipster',
        true,
        true,
        'v1.0',
        {
          channelName: (form as any).channelName || '',
          sports: selectedSports || [],
          bio: (form as any).bio || '',
          experience: (form as any).experience || '',
        }
      );
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setErrors({ email: 'An account with this email already exists' });
      } else {
        setErrors({ general: err.message || 'Registration failed. Try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Password strength ────────────────────────────────────────────────────────
  const pwdStrength = (p: string) => {
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };
  const strength = pwdStrength(form.password);
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="relative min-h-screen w-full bg-black flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#1a0a0a_0%,#0a0a0a_50%,#0f0a0a_100%)]" />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#ef4444]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#dc2626]/5 rounded-full blur-3xl" />
      </div>
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Mobile logo */}
      <div className="lg:hidden absolute top-6 left-6 z-20 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#ef4444]/40">
          <img src="/logo.jpg" alt="Arena" className="w-full h-full object-cover" />
        </div>
        <span className="text-white font-black text-lg">Arena</span>
      </div>

      {/* Main container — split on desktop */}
      <div className="relative z-10 w-full max-w-5xl mx-auto min-h-screen lg:min-h-0 lg:min-h-[600px] flex">
        {/* Left panel — desktop only */}
        <div className="hidden lg:block flex-1 border-r border-white/5">
          <BrandingPanel />
        </div>

        {/* Right panel — auth card */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-[380px]">
            <AnimatePresence mode="wait" custom={direction}>

              {/* ── LANDING ─────────────────────────────────────────────── */}
              {mode === 'landing' && (
                <motion.div
                  key="landing"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="space-y-5"
                >
                  {/* Hero */}
                  <div className="text-center pt-16 lg:pt-0">
                    <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-[#ef4444]/20 shadow-xl shadow-red-500/20 mx-auto mb-5">
                      <img src="/logo.jpg" alt="Arena" className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-3xl font-black text-white">Welcome to Arena</h2>
                    <p className="text-white/40 text-sm mt-2">The home of sports fans worldwide</p>
                  </div>

                  {/* Error */}
                  {errors.general && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-sm text-red-400">{errors.general}</p>
                    </div>
                  )}

                  {/* Social */}
                  <div className="space-y-3">
                    <SocialButton
                      icon={<img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="" />}
                      label="Continue with Google"
                      onClick={() => handleSocialLogin('google')}
                      loading={socialLoading === 'google'}
                    />
                    <SocialButton
                      icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>}
                      label="Continue with Apple"
                      onClick={() => handleSocialLogin('apple')}
                      loading={socialLoading === 'apple'}
                    />
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-xs text-white/25 font-medium">or continue with email</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>

                  {/* CTAs */}
                  <div className="space-y-3">
                    <button
                      onClick={() => goTo('signup', 1)}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-red-500/25"
                    >
                      Create Account <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => goTo('signin', 1)}
                      className="w-full flex items-center justify-center gap-2 border border-white/15 text-white/80 font-semibold text-sm py-3.5 rounded-2xl hover:bg-white/5 hover:border-white/25 transition-all"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => goTo('tipster', 1)}
                      className="w-full flex items-center justify-center gap-2 border border-[#ef4444]/25 text-[#ef4444] font-semibold text-sm py-3 rounded-2xl hover:bg-[#ef4444]/8 transition-all"
                    >
                      <Trophy className="w-4 h-4" /> Register as Tipster
                    </button>
                  </div>

                  <p className="text-[11px] text-white/25 text-center leading-relaxed">
                    By continuing you agree to our{' '}
                    <a href="https://teamly.com/legal/terms" className="text-white/40 underline hover:text-white/60 transition-colors" target="_blank" rel="noreferrer">Terms</a>,{' '}
                    <a href="/privacy" className="text-white/40 underline hover:text-white/60 transition-colors">Privacy Policy</a> and{' '}
                    <a href="https://teamly.com/legal/cookie-policy" className="text-white/40 underline hover:text-white/60 transition-colors" target="_blank" rel="noreferrer">Cookie Policy</a>.
                  </p>
                </motion.div>
              )}

              {/* ── SIGN IN ──────────────────────────────────────────────── */}
              {mode === 'signin' && (
                <motion.div
                  key="signin"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="space-y-5"
                >
                  <div>
                    <button
                      onClick={() => goTo('landing', -1)}
                      className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm mb-6 group"
                    >
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back
                    </button>
                    <h2 className="text-2xl font-black text-white">Sign in</h2>
                    <p className="text-white/40 text-sm mt-1">Welcome back to Arena 👋</p>
                  </div>

                  {errors.general && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-sm text-red-400">{errors.general}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <FloatingInput
                      icon={Mail}
                      type="email"
                      placeholder="Email address"
                      value={form.email}
                      onChange={v => update('email', v)}
                      error={errors.email}
                      autoComplete="email"
                    />
                    <FloatingInput
                      icon={Lock}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={form.password}
                      onChange={v => update('password', v)}
                      error={errors.password}
                      autoComplete="current-password"
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowPassword(s => !s)}
                          className="text-white/30 hover:text-white/60 transition-colors shrink-0"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    <div className="text-right">
                      <button
                        onClick={() => navigate('/auth/forgot-password')}
                        className="text-xs text-[#ef4444] hover:text-[#f87171] hover:underline transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-red-500/25 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                  </button>

                  {/* Social */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-xs text-white/25">or</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>
                  <div className="space-y-2">
                    <SocialButton
                      icon={<img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="" />}
                      label="Continue with Google"
                      onClick={() => handleSocialLogin('google')}
                      loading={socialLoading === 'google'}
                    />
                  </div>

                  <p className="text-sm text-white/40 text-center">
                    By continuing, you agree to our{' '}
                    <a href="https://teamly.com/legal/terms" className="text-[#ef4444] underline" target="_blank" rel="noreferrer">
                      Terms & Conditions
                    </a>{' '}
                    and acknowledge our{' '}
                    <a href="/privacy" className="text-[#ef4444] underline">
                      Privacy Policy
                    </a>.
                    Learn more in our{' '}
                    <a href="https://teamly.com/legal/cookie-policy" className="text-[#ef4444] underline" target="_blank" rel="noreferrer">
                      Cookie Policy
                    </a>.
                  </p>
                  <p className="text-sm text-white/40 text-center">
                    Don't have an account?{' '}
                    <button onClick={() => goTo('signup', 1)} className="text-[#ef4444] font-bold hover:underline transition-colors">
                      Sign up
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ── SIGN UP ──────────────────────────────────────────────── */}
              {mode === 'signup' && (
                <motion.div
                  key="signup"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="space-y-5"
                >
                  <div>
                    <button
                      onClick={() => goTo('landing', -1)}
                      className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm mb-6 group"
                    >
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back
                    </button>
                    <h2 className="text-2xl font-black text-white">Create account</h2>
                    <p className="text-white/40 text-sm mt-1">Join the Arena community 🏟️</p>
                  </div>

                  <div className="space-y-3">
                    <FloatingInput
                      icon={User}
                      placeholder="Full name"
                      value={form.name}
                      onChange={v => update('name', v)}
                      error={errors.name}
                      autoComplete="name"
                    />
                    <FloatingInput
                      icon={Mail}
                      type="email"
                      placeholder="Email address"
                      value={form.email}
                      onChange={v => update('email', v)}
                      error={errors.email}
                      autoComplete="email"
                    />
                    <FloatingInput
                      icon={Lock}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create password"
                      value={form.password}
                      onChange={v => update('password', v)}
                      error={errors.password}
                      autoComplete="new-password"
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowPassword(s => !s)}
                          className="text-white/30 hover:text-white/60 transition-colors shrink-0"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />

                    {/* Password strength */}
                    {form.password.length > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map(i => (
                            <div
                              key={i}
                              className={cn('h-1 flex-1 rounded-full transition-all duration-300', i < strength ? strengthColors[strength - 1] : 'bg-white/10')}
                            />
                          ))}
                        </div>
                        <p className={cn('text-xs', strength <= 1 ? 'text-red-400' : strength === 2 ? 'text-orange-400' : strength === 3 ? 'text-yellow-400' : 'text-green-400')}>
                          {strengthLabels[strength - 1] || 'Enter a password'}
                        </p>
                      </motion.div>
                    )}

                    <FloatingInput
                      icon={Lock}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={form.confirmPassword}
                      onChange={v => update('confirmPassword', v)}
                      error={errors.confirmPassword}
                      autoComplete="new-password"
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(s => !s)}
                          className="text-white/30 hover:text-white/60 transition-colors shrink-0"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />

                    <label className="flex items-start gap-3 mt-2 text-sm text-white/80">
                      <input
                        type="checkbox"
                        checked={policyAccepted}
                        onChange={e => {
                          setPolicyAccepted(e.target.checked);
                          setErrors(prev => ({ ...prev, policyAccepted: '' }));
                        }}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-black text-[#ef4444] focus:ring-[#ef4444]"
                      />
                      <span>
                        I have read and agree to the{' '}
                        <a href="https://teamly.com/legal/terms" target="_blank" rel="noreferrer" className="text-[#ef4444] underline">
                          Terms & Conditions
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" className="text-[#ef4444] underline">
                          Privacy Policy
                        </a>.
                      </span>
                    </label>
                    {errors.policyAccepted && (
                      <p className="text-xs text-red-400 mt-1 ml-7">{errors.policyAccepted}</p>
                    )}
                  </div>

                  <button
                    onClick={handleSignUp}
                    disabled={loading || !policyAccepted}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-red-500/25 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                  </button>

                  <p className="text-[11px] text-white/25 text-center leading-relaxed">
                    By signing up you agree to our{' '}
                    <a href="https://teamly.com/legal/terms" target="_blank" rel="noreferrer" className="text-[#ef4444] underline">
                      Terms & Conditions
                    </a>{' '}
                    and acknowledge our{' '}
                    <a href="/privacy" className="text-[#ef4444] underline">
                      Privacy Policy
                    </a>.
                    Learn more in our{' '}
                    <a href="https://teamly.com/legal/cookie-policy" target="_blank" rel="noreferrer" className="text-[#ef4444] underline">
                      Cookie Policy
                    </a>.
                  </p>

                  <p className="text-sm text-white/40 text-center">
                    Already have an account?{' '}
                    <button onClick={() => goTo('signin', -1)} className="text-[#ef4444] font-bold hover:underline">Sign in</button>
                  </p>
                </motion.div>
              )}

              {/* ── TIPSTER REGISTER ─────────────────────────────────────── */}
              {mode === 'tipster' && (
                <motion.div
                  key="tipster"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="space-y-5"
                >
                  <div>
                    <button
                      onClick={() => { goTo('landing', -1); setTipsterStep(1); }}
                      className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm mb-5 group"
                    >
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back
                    </button>

                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-5">
                      {[1, 2, 3].map(s => (
                        <div key={s} className="flex items-center gap-2 flex-1">
                          <div className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all shrink-0',
                            s < tipsterStep ? 'bg-[#ef4444] text-white' :
                              s === tipsterStep ? 'bg-[#ef4444] text-white ring-4 ring-[#ef4444]/20' :
                                'bg-white/10 text-white/40'
                          )}>
                            {s < tipsterStep ? <Check className="w-3.5 h-3.5" /> : s}
                          </div>
                          {s < 3 && <div className={cn('h-px flex-1', s < tipsterStep ? 'bg-[#ef4444]' : 'bg-white/10')} />}
                        </div>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {/* Step 1 — Perks & Agreement */}
                    {tipsterStep === 1 && (
                      <motion.div key="ts1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#ef4444]/15 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-[#ef4444]" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-white">Become a Tipster</h2>
                            <p className="text-xs text-white/40">Share your expertise & earn</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          {PERKS.map((perk, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                              <div className="w-7 h-7 rounded-full bg-[#ef4444]/10 flex items-center justify-center shrink-0">
                                <perk.icon className="w-3.5 h-3.5 text-[#ef4444]" />
                              </div>
                              <p className="text-sm text-white/70">{perk.text}</p>
                            </div>
                          ))}
                        </div>

                        <div className="bg-[#ef4444]/8 border border-[#ef4444]/15 rounded-2xl p-4">
                          <p className="text-xs text-[#ef4444] font-bold mb-1.5">⚠️ Code of Conduct</p>
                          <p className="text-xs text-white/50 leading-relaxed">
                            Tipsters must post honest predictions only. Misleading or fraudulent tickets will result in a permanent ban without refund.
                          </p>
                        </div>

                        <button
                          onClick={() => setTipsterStep(2)}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all"
                        >
                          I Agree — Continue <ChevronRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}

                    {/* Step 2 — Speciality */}
                    {tipsterStep === 2 && (
                      <motion.div key="ts2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div>
                          <h2 className="text-xl font-black text-white">Your Speciality</h2>
                          <p className="text-sm text-white/40 mt-0.5">Pick the sports you specialise in</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {SPORTS.map(sport => (
                            <button
                              key={sport}
                              onClick={() => toggleSport(sport)}
                              className={cn(
                                'py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-left',
                                selectedSports.includes(sport)
                                  ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444] shadow-[0_0_0_1px_rgba(239,68,68,0.15)]'
                                  : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20 hover:bg-white/8'
                              )}
                            >
                              {selectedSports.includes(sport) && <Check className="w-3 h-3 inline mr-1.5" />}
                              {sport}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-3">
                          <textarea
                            placeholder="Brief bio — tell users about yourself and your edge..."
                            value={form.bio}
                            onChange={e => update('bio', e.target.value)}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 focus:border-[#ef4444]/50 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none resize-none transition-all focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]"
                          />
                          <input
                            type="text"
                            placeholder="Years of experience (e.g. 3 years)"
                            value={form.experience}
                            onChange={e => update('experience', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 focus:border-[#ef4444]/50 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]"
                          />
                        </div>

                        <button
                          onClick={() => setTipsterStep(3)}
                          disabled={selectedSports.length === 0}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3.5 rounded-2xl hover:opacity-90 transition-all disabled:opacity-40"
                        >
                          Continue <ChevronRight className="w-4 h-4" />
                        </button>
                        {selectedSports.length === 0 && (
                          <p className="text-xs text-white/30 text-center">Select at least one sport to continue</p>
                        )}
                      </motion.div>
                    )}

                    {/* Step 3 — Account Details */}
                    {tipsterStep === 3 && (
                      <motion.div key="ts3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div>
                          <h2 className="text-xl font-black text-white">Account Details</h2>
                          <p className="text-sm text-white/40 mt-0.5">Create your tipster account</p>
                        </div>

                        {errors.general && (
                          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            <p className="text-sm text-red-400">{errors.general}</p>
                          </div>
                        )}

                        <div className="space-y-3">
                          <FloatingInput icon={User} placeholder="Full name" value={form.name} onChange={v => update('name', v)} error={errors.name} autoComplete="name" />
                          <FloatingInput icon={Mail} type="email" placeholder="Email address" value={form.email} onChange={v => update('email', v)} error={errors.email} autoComplete="email" />
                          <FloatingInput icon={Zap} placeholder="Channel name (e.g. GoldTips VIP)" value={form.channelName} onChange={v => update('channelName', v)} error={errors.channelName} />
                          <FloatingInput
                            icon={Lock}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create password"
                            value={form.password}
                            onChange={v => update('password', v)}
                            error={errors.password}
                            autoComplete="new-password"
                            suffix={
                              <button type="button" onClick={() => setShowPassword(s => !s)} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            }
                          />
                        </div>

                        <button
                          onClick={handleTipsterSubmit}
                          disabled={loading}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-red-500/25 disabled:opacity-60"
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Application <ArrowRight className="w-4 h-4" /></>}
                        </button>
                        <p className="text-xs text-white/25 text-center leading-relaxed">
                          Your application will be reviewed within 24–48 hours. You'll get an email once approved.
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
    </div>
  );
}
