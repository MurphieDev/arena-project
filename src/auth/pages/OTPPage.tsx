import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, CheckCircle2, RefreshCw, Mail, AlertCircle } from 'lucide-react';
import { TempPasswordStorage } from '../../services/storage/TempPasswordStorage';
import { useAuth } from '../hooks/AuthContext';
import { auth } from '../../lib/firebase';
import { sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';

// ── Mock OTP for demo ─────────────────────────────────────────────────────────
const OTP_LENGTH = 6;

export function OTPPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-start resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const t = setTimeout(() => setResendCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCountdown]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  // ── Verify handler ────────────────────────────────────────────────────────
  const handleVerify = useCallback(async (code?: string) => {
    const otpString = code ?? otp.join('');
    if (otpString.length !== OTP_LENGTH) return;

    try {
      setLoading(true);
      setError(null);

      const tempData = TempPasswordStorage.getTempPassword();
      if (!tempData) {
        setError('Session expired. Please sign in again.');
        setTimeout(() => navigate('/auth'), 1500);
        return;
      }

      // Sign in to get fresh user object
      const result = await signInWithEmailAndPassword(auth, tempData.email, tempData.password);
      await result.user.reload();

      if (result.user.emailVerified) {
        // Email is verified — complete login
        await login(tempData.email, tempData.password);
        TempPasswordStorage.clearTempPassword();
        setVerified(true);
        setTimeout(() => navigate('/'), 1200);
      } else {
        // Email not verified yet
        setShake(true);
        setError('Email not verified yet. Click the link in your inbox first, then come back.');
        setTimeout(() => {
          setShake(false);
          setOtp(Array(OTP_LENGTH).fill(''));
          inputRefs.current[0]?.focus();
        }, 600);
      }
    } catch (err: any) {
      setShake(true);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Session expired. Please sign in again.');
        setTimeout(() => navigate('/auth'), 1500);
      } else {
        setError(err.message || 'Verification failed. Try again.');
      }
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  }, [otp, login, navigate]);

  // ── Auto-submit when all filled ───────────────────────────────────────────
  useEffect(() => {
    if (otp.every(d => d !== '') && !loading && !verified) {
      handleVerify();
    }
  }, [otp, handleVerify, loading, verified]);

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError(null);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // ── Paste handler ─────────────────────────────────────────────────────────
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newOtp = [...Array(OTP_LENGTH).fill('')];
    pasted.split('').forEach((d, i) => { newOtp[i] = d; });
    setOtp(newOtp);
    setError(null);
    const nextEmpty = pasted.length < OTP_LENGTH ? pasted.length : OTP_LENGTH - 1;
    inputRefs.current[nextEmpty]?.focus();
  };

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCountdown > 0 || resending) return;
    setResending(true);
    setError(null);
    setOtp(Array(OTP_LENGTH).fill(''));
    try {
      const tempData = TempPasswordStorage.getTempPassword();
      if (tempData) {
        const result = await signInWithEmailAndPassword(auth, tempData.email, tempData.password);
        await sendEmailVerification(result.user);
      }
      setResendCountdown(30);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError('Failed to resend. Try again in a moment.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-black flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#1a0a0a_0%,#0a0a0a_50%,#0f0a0a_100%)]" />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#ef4444]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#dc2626]/5 rounded-full blur-3xl pointer-events-none" />
      </div>
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Logo */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#ef4444]/40">
          <img src="/logo.jpg" alt="Arena" className="w-full h-full object-cover" />
        </div>
        <span className="text-white font-black text-lg">Arena</span>
      </div>

      <div className="relative z-10 w-full max-w-[420px] mx-6">
        <AnimatePresence mode="wait">
          {/* ── Success State ─────────────────────────────────────────── */}
          {verified && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center"
              >
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </motion.div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-white">Verified!</h2>
                <p className="text-white/40 text-sm mt-1">Taking you to Arena...</p>
              </div>
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                  className="h-full bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* ── OTP Form ──────────────────────────────────────────────── */}
          {!verified && (
            <motion.div
              key="otp-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              {/* Back button */}
              <button
                onClick={() => { TempPasswordStorage.clearTempPassword(); navigate('/auth'); }}
                className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm mb-7 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to sign in
              </button>

              {/* Header */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center mb-4">
                  <Mail className="w-7 h-7 text-[#ef4444]" />
                </div>
                <h2 className="text-2xl font-black text-white">Check your email</h2>
                <p className="text-white/40 text-sm mt-2 max-w-[260px] leading-relaxed">
                  We sent a 6-digit verification code to your email address
                </p>
                <div className="mt-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                  <p className="text-xs text-white/50">Check your inbox and click the verification link, then press Verify below</p>
                </div>
              </div>

              {/* OTP inputs */}
              <motion.div
                animate={shake ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="flex justify-center gap-2.5 mb-6"
                onPaste={handlePaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    className={`
                      w-12 h-14 text-center text-xl font-black rounded-2xl outline-none transition-all duration-200
                      ${digit
                        ? 'bg-[#ef4444]/10 border-2 border-[#ef4444]/50 text-white shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                        : 'bg-white/5 border-2 border-white/10 text-white focus:border-[#ef4444]/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]'
                      }
                      ${error ? 'border-red-500/50' : ''}
                    `}
                  />
                ))}
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Verify button */}
              <button
                onClick={() => handleVerify()}
                disabled={loading || otp.some(d => !d)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-red-500/25 disabled:opacity-40 mb-4"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                ) : (
                  <>Verify Code</>
                )}
              </button>

              {/* Resend */}
              <div className="text-center">
                <p className="text-sm text-white/40">Didn't receive a code?</p>
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
        </AnimatePresence>
      </div>
    </div>
  );
}
