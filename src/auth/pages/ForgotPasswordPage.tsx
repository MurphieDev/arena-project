import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2,
  CheckCircle2, AlertCircle, RefreshCw, KeyRound
} from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';

type Step = 'email' | 'otp' | 'newpassword' | 'success';

const OTP_LENGTH = 6;
const MOCK_OTP = '123456';

// ── Floating Input ─────────────────────────────────────────────────────────────
function FloatingInput({
  icon: Icon, type = 'text', placeholder, value, onChange, error, suffix, autoComplete,
}: {
  icon: React.ElementType; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; error?: string; suffix?: React.ReactNode; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 border transition-all duration-200 ${
        focused ? 'bg-white/8 border-[#ef4444]/60 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
          : error ? 'bg-white/5 border-red-500/40'
          : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}>
        <Icon className={`w-4 h-4 shrink-0 transition-colors ${focused ? 'text-[#ef4444]' : 'text-white/30'}`} />
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
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5 ml-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </motion.p>
      )}
    </div>
  );
}

// ── Password strength ──────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const textColors = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400'];

  if (!password) return null;

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : 'bg-white/10'}`} />
        ))}
      </div>
      <p className={`text-xs ${textColors[score - 1] || 'text-white/30'}`}>
        {score > 0 ? labels[score - 1] : 'Enter a password'}
      </p>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first OTP input when step changes
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
      setResendCountdown(30);
    }
  }, [step]);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const t = setTimeout(() => setResendCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCountdown]);

  // ── OTP auto-submit ───────────────────────────────────────────────────────
  const verifyOtp = useCallback(async (code?: string) => {
    const otpStr = code ?? otp.join('');
    if (otpStr.length !== OTP_LENGTH) return;
    if (otpStr !== MOCK_OTP) {
      setShake(true);
      setError(`Invalid code. Hint: use ${MOCK_OTP} for demo.`);
      setTimeout(() => {
        setShake(false);
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }, 600);
      return;
    }
    setError(null);
    setStep('newpassword');
  }, [otp]);

  useEffect(() => {
    if (step === 'otp' && otp.every(d => d !== '')) {
      verifyOtp();
    }
  }, [otp, step, verifyOtp]);

  // ── OTP input handlers ────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError(null);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index]) { const n = [...otp]; n[index] = ''; setOtp(n); }
      else if (index > 0) inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newOtp = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((d, i) => { newOtp[i] = d; });
    setOtp(newOtp);
    setError(null);
    const nextIdx = pasted.length < OTP_LENGTH ? pasted.length : OTP_LENGTH - 1;
    inputRefs.current[nextIdx]?.focus();
  };

  // ── Step handlers ─────────────────────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!email) { setError('Email address is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address'); return; }
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      // Firebase sends the reset link directly - no OTP needed
      // Skip OTP step and go straight to success
      setStep('success');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait before trying again.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || resending) return;
    setResending(true);
    setError(null);
    setOtp(Array(OTP_LENGTH).fill(''));
    await new Promise(r => setTimeout(r, 800));
    setResendCountdown(30);
    setResending(false);
    inputRefs.current[0]?.focus();
  };

  const handleResetPassword = async () => {
    if (!newPassword) { setError('New password is required'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setError(null);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setStep('success');
  };

  // ── Background ────────────────────────────────────────────────────────────
  const Bg = () => (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#1a0a0a_0%,#0a0a0a_50%,#0f0a0a_100%)]" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#ef4444]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#dc2626]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
    </>
  );

  return (
    <div className="relative min-h-screen w-full bg-black flex items-center justify-center overflow-hidden">
      <Bg />

      {/* Logo */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#ef4444]/40">
          <img src="/logo.jpg" alt="Arena" className="w-full h-full object-cover" />
        </div>
        <span className="text-white font-black text-lg">Arena</span>
      </div>

      <div className="relative z-10 w-full max-w-[420px] mx-6">
        <AnimatePresence mode="wait">

          {/* ── STEP 1 — Email ─────────────────────────────────────────── */}
          {step === 'email' && (
            <motion.div
              key="email-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <button
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to sign in
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center mb-4">
                  <Mail className="w-7 h-7 text-[#ef4444]" />
                </div>
                <h2 className="text-2xl font-black text-white">Forgot password?</h2>
                <p className="text-white/40 text-sm mt-2 max-w-[260px] leading-relaxed">
                  Enter your email and we'll send you a reset code
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <FloatingInput
                icon={Mail}
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={v => { setEmail(v); setError(null); }}
                autoComplete="email"
              />

              <button
                onClick={handleSendEmail}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-red-500/25 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Code'}
              </button>
            </motion.div>
          )}

          {/* ── STEP 2 — OTP ──────────────────────────────────────────── */}
          {step === 'otp' && (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <button
                onClick={() => { setStep('email'); setOtp(Array(OTP_LENGTH).fill('')); setError(null); }}
                className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center mb-4">
                  <KeyRound className="w-7 h-7 text-[#ef4444]" />
                </div>
                <h2 className="text-2xl font-black text-white">Enter reset code</h2>
                <p className="text-white/40 text-sm mt-2 max-w-[260px] leading-relaxed">
                  We sent a 6-digit code to <span className="text-white/60 font-medium">{email}</span>
                </p>

              </div>

              <motion.div
                animate={shake ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="flex justify-center gap-2.5"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-xl font-black rounded-2xl outline-none transition-all duration-200 ${
                      digit
                        ? 'bg-[#ef4444]/10 border-2 border-[#ef4444]/50 text-white shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                        : `bg-white/5 border-2 text-white focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.08)] ${error ? 'border-red-500/50' : 'border-white/10 focus:border-[#ef4444]/50'}`
                    }`}
                  />
                ))}
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => verifyOtp()}
                disabled={otp.some(d => !d)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3.5 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-red-500/25 disabled:opacity-40"
              >
                Verify Code
              </button>

              <div className="text-center">
                <p className="text-sm text-white/40">Didn't receive it?</p>
                <button
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || resending}
                  className="mt-1 flex items-center justify-center gap-1.5 mx-auto text-sm font-semibold transition-colors disabled:text-white/25 text-[#ef4444] hover:text-[#f87171]"
                >
                  {resending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                    : resendCountdown > 0
                      ? `Resend in ${resendCountdown}s`
                      : <><RefreshCw className="w-3.5 h-3.5" /> Resend code</>
                  }
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3 — New Password ─────────────────────────────────── */}
          {step === 'newpassword' && (
            <motion.div
              key="newpwd-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-5"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center mb-4">
                  <Lock className="w-7 h-7 text-[#ef4444]" />
                </div>
                <h2 className="text-2xl font-black text-white">New password</h2>
                <p className="text-white/40 text-sm mt-2">Choose a strong, secure password</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <FloatingInput
                  icon={Lock}
                  type={showNew ? 'text' : 'password'}
                  placeholder="New password"
                  value={newPassword}
                  onChange={v => { setNewPassword(v); setError(null); }}
                  autoComplete="new-password"
                  suffix={
                    <button type="button" onClick={() => setShowNew(s => !s)} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <PasswordStrength password={newPassword} />
                <FloatingInput
                  icon={Lock}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={v => { setConfirmPassword(v); setError(null); }}
                  autoComplete="new-password"
                  suffix={
                    <button type="button" onClick={() => setShowConfirm(s => !s)} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-red-500/25 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
              </button>
            </motion.div>
          )}

          {/* ── STEP 4 — Success ─────────────────────────────────────── */}
          {step === 'success' && (
            <motion.div
              key="success-step"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-5 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center"
              >
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black text-white">Password reset!</h2>
                <p className="text-white/40 text-sm mt-2 leading-relaxed max-w-[240px] mx-auto">
                  A password reset link has been sent to your email. Click the link to set a new password, then sign in.
                </p>
              </div>
              <button
                onClick={() => navigate('/auth')}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-red-500/25"
              >
                Sign In Now
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
