import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, Check, ChevronRight, Zap, AlertCircle, Loader, CreditCard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { platformPricingService } from '../../services/pricing/PlatformPricingService';
import { db } from '../../lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { calcTipsterEarnings, formatNgn, type PlatformPricing } from '../../config/platformPricing';
import { DEFAULT_PLATFORM_PRICING } from '../../config/platformPricing';

const perks = [
  { icon: Trophy, label: 'Monetize your expertise' },
  { icon: Zap, label: 'Real-time prediction engine' },
  { icon: Check, label: 'Performance analytics' },
  { icon: Check, label: 'Subscriber management' },
  { icon: Check, label: 'Revenue dashboard' },
  { icon: Check, label: 'Premium badges' },
];

const sports = [
  'Football', 'Basketball', 'Tennis',
  'Cricket', 'Baseball', 'Ice Hockey',
  'Volleyball', 'Rugby'
];

export default function BecomeTipsterPage() {
  const navigate = useNavigate();
  const { becomeTipster, user } = useAuth();
  const currentUser = user as any;

  const [step, setStep] = useState(1);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [form, setForm] = useState({
    bio: '',
    experience: '',
    channelName: '',
    channelPrice: '2500',
    agreed: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PlatformPricing>(DEFAULT_PLATFORM_PRICING);

  useEffect(() => {
    platformPricingService.getPricing().then((p) => {
      setPricing(p);
      setForm((prev) => ({ ...prev, channelPrice: String(p.defaultChannelPriceNgn) }));
    });
  }, []);

  const update = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSubmitError(null);
  };

  const toggleSport = (sport: string) => {
    setSelectedSports(prev =>
      prev.includes(sport)
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    );
  };

  const canProceedStep2 = selectedSports.length > 0 && form.bio.trim();
  const canProceedStep3 = form.channelName.trim() && form.agreed;


  const activateTipster = async (paymentRef: string = 'FREE') => {
    try {
      await becomeTipster({
        bio: (form as any).bio || '',
        experience: (form as any).experience || '',
        channelName: (form as any).channelName || '',
        specialties: Array.isArray(selectedSports) ? selectedSports.filter(Boolean) : [],
        sports: Array.isArray(selectedSports) ? selectedSports.filter(Boolean) : [],
        price: Number((form as any).channelPrice) || 0,
      });
      // Log registration
      const userId = currentUser?.id || currentUser?.uid || '';
      if (userId && paymentRef !== 'FREE') {
        await addDoc(collection(db, 'transactions'), {
          userId,
          type: 'debit',
          desc: 'Tipster Registration',
          amount: 0,
          status: 'success',
          reference: paymentRef,
          createdAt: serverTimestamp(),
        });
      }
      setSubmitting(false);
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      console.error('Tipster activation error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to create tipster account. Please try again.');
      setSubmitting(false);
    }
  };

  const handleBecomeTipster = async () => {
    if (!canProceedStep3) return;

    const channelPriceNum = Number(form.channelPrice) || 0;
    if (channelPriceNum > 0 && (channelPriceNum < pricing.minChannelPriceNgn || channelPriceNum > pricing.maxChannelPriceNgn)) {
      setSubmitError(`Channel price must be between ${formatNgn(pricing.minChannelPriceNgn)} and ${formatNgn(pricing.maxChannelPriceNgn)}`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Registration is FREE — activate directly
    await activateTipster('FREE');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f] px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-[#ef4444]" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">Become a Tipster</h1>
            <p className="text-xs text-[#71767b]">Step {step} of 3</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#ef4444]"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Step 1 */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-black text-white mb-2">
                Upgrade Your Account
              </h2>
              <p className="text-sm text-[#71767b] mb-4 leading-relaxed">
                Becoming a tipster is a <span className="text-white font-bold">permanent upgrade</span> to your Arena account.
                You'll gain access to exclusive tools and features to share your expertise and earn from your predictions.
              </p>

              {/* Platform fees */}
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 mb-6 space-y-2">
                <p className="text-xs font-black text-[#71767b] uppercase tracking-wider">Platform fees</p>
                <div className="flex justify-between text-sm">
                  <span className="text-[#71767b]">One-time registration</span>
                  <span className="text-white font-bold">
                    {pricing.tipsterRegistrationFeeNgn > 0
                      ? formatNgn(pricing.tipsterRegistrationFeeNgn)
                      : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#71767b]">Subscription commission</span>
                  <span className="text-white font-bold">{pricing.subscriptionCommissionPercent}% to Arena</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#71767b]">Paid prediction commission</span>
                  <span className="text-white font-bold">{pricing.predictionCommissionPercent}% to Arena</span>
                </div>
              </div>

              {/* Perks */}
              <div className="space-y-3 mb-6">
                {perks.map((perk, i) => {
                  const Icon = perk.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-3 bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-3"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#ef4444]/15 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#ef4444]" />
                      </div>
                      <p className="text-sm text-[#e7e9ea]">{perk.label}</p>
                      <Check className="w-4 h-4 text-green-400 shrink-0 ml-auto" />
                    </motion.div>
                  );
                })}
              </div>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-6">
                <p className="text-sm font-bold text-yellow-400 mb-1">⚠️ Important Notice</p>
                <p className="text-xs text-[#71767b] leading-relaxed">
                  Upgrading to a Tipster account is <span className="text-white font-bold">permanent and irreversible</span>.
                  Your account will be held to a higher standard. Misleading predictions or fraudulent tickets
                  will result in immediate suspension.
                </p>
              </div>

              {/* Code of Conduct */}
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 mb-6">
                <p className="text-sm font-bold text-white mb-2">Tipster Code of Conduct</p>
                <ul className="space-y-2">
                  {[
                    'Post only honest and accurate predictions',
                    'Never guarantee outcomes to subscribers',
                    'Clearly label all tickets with correct odds',
                    'Maintain transparency with your win/loss record',
                    'Respect all community members and users',
                  ].map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#71767b]">
                      <span className="text-[#ef4444] font-black shrink-0 mt-0.5">{i + 1}.</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold py-3 rounded-full hover:opacity-90 transition-all shadow-lg shadow-red-500/20"
              >
                I Understand — Continue <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-black text-white mb-2">Your Speciality</h2>
              <p className="text-sm text-[#71767b] mb-6">
                Tell us what sports you specialise in and a bit about yourself.
              </p>

              {/* Sports */}
              <div className="mb-5">
                <label className="text-xs font-bold text-[#71767b] mb-2 block">
                  Sports Speciality <span className="text-[#ef4444]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {sports.map(sport => (
                    <button
                      key={sport}
                      onClick={() => toggleSport(sport)}
                      className={cn(
                        'py-2 px-3 text-xs font-bold rounded-xl transition-all border',
                        selectedSports.includes(sport)
                          ? 'bg-[#ef4444] border-[#ef4444] text-white'
                          : 'bg-[#111] border-[#1f1f1f] text-[#71767b] hover:border-[#ef4444]/50'
                      )}
                    >
                      {selectedSports.includes(sport) && <Check className="w-3 h-3 inline mr-1" />}
                      {sport}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div className="mb-4">
                <label className="text-xs font-bold text-[#71767b] mb-2 block">
                  Bio <span className="text-[#ef4444]">*</span>
                </label>
                <textarea
                  value={form.bio}
                  onChange={e => update('bio', e.target.value)}
                  placeholder="Tell us about yourself and your expertise..."
                  rows={4}
                  className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none resize-none transition-all"
                />
              </div>

              {/* Experience */}
              <div className="mb-4">
                <label className="text-xs font-bold text-[#71767b] mb-2 block">
                  Experience <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="text"
                  value={form.experience}
                  onChange={e => update('experience', e.target.value)}
                  placeholder="e.g. 3 years"
                  className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-[#1f1f1f] rounded-full text-sm font-bold text-[#71767b] hover:border-white hover:text-white transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold py-3 rounded-full hover:opacity-90 transition-all disabled:opacity-40"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-black text-white mb-2">Set Up Your Channel</h2>
              <p className="text-sm text-[#71767b] mb-6">
                Choose a name for your prediction channel. You can create more channels later from your dashboard.
              </p>

              {/* Channel Name */}
              <div className="mb-4">
                <label className="text-xs font-bold text-[#71767b] mb-2 block">
                  Channel Name <span className="text-[#ef4444]">*</span>
                </label>
                <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-xl px-4 py-3 transition-all">
                  <Zap className="w-4 h-4 text-[#71767b] shrink-0" />
                  <input
                    type="text"
                    value={form.channelName}
                    onChange={e => update('channelName', e.target.value)}
                    placeholder="e.g. GoldTips VIP"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
                  />
                </div>
              </div>

              {/* Channel Price */}
              <div className="mb-4">
                <label className="text-xs font-bold text-[#71767b] mb-2 block">
                  Monthly VIP Price (₦)
                </label>
                <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-xl px-4 py-3 transition-all">
                  <CreditCard className="w-4 h-4 text-[#71767b] shrink-0" />
                  <input
                    type="number"
                    value={form.channelPrice}
                    onChange={e => update('channelPrice', e.target.value)}
                    placeholder="e.g. 2500"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
                  />
                </div>
                <p className="text-[10px] text-[#71767b] mt-1">
                  Set to 0 for a free channel. Allowed: {formatNgn(pricing.minChannelPriceNgn)} – {formatNgn(pricing.maxChannelPriceNgn)}/mo
                </p>
              </div>

              {/* Earnings preview */}
              {Number(form.channelPrice) > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs space-y-1">
                  <p className="text-green-400 font-bold">Your earnings per subscriber / month</p>
                  {(() => {
                    const e = calcTipsterEarnings(Number(form.channelPrice), pricing.subscriptionCommissionPercent);
                    return (
                      <>
                        <div className="flex justify-between text-[#71767b]">
                          <span>Subscriber pays</span>
                          <span className="text-white">{formatNgn(e.gross)}</span>
                        </div>
                        <div className="flex justify-between text-[#71767b]">
                          <span>Arena commission ({e.commissionPercent}%)</span>
                          <span className="text-[#ef4444]">−{formatNgn(e.commission)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span className="text-white">You receive</span>
                          <span className="text-green-400">{formatNgn(e.net)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Summary */}
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 mb-5">
                <p className="text-sm font-bold text-white mb-3">Application Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#71767b]">Sports</span>
                    <span className="text-white font-semibold">{selectedSports.join(', ')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#71767b]">Experience</span>
                    <span className="text-white font-semibold">{form.experience || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#71767b]">Channel</span>
                    <span className="text-white font-semibold">{form.channelName || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#71767b]">Registration fee</span>
                    <span className="text-white font-semibold">
                      {pricing.tipsterRegistrationFeeNgn > 0
                        ? formatNgn(pricing.tipsterRegistrationFeeNgn)
                        : 'Free'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#71767b]">Arena commission</span>
                    <span className="text-white font-semibold">{pricing.subscriptionCommissionPercent}% on subscriptions</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#71767b]">Channel price</span>
                    <span className="text-white font-semibold">
                      {Number(form.channelPrice) > 0 ? `${formatNgn(Number(form.channelPrice))}/mo` : 'Free Channel'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#71767b]">Account Type</span>
                    <span className="text-[#ef4444] font-black">TIPSTER (Permanent)</span>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-3 mb-4 flex gap-2 items-start"
                >
                  <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#ef4444]">{submitError}</p>
                </motion.div>
              )}

              {/* Agreement checkbox */}
              <button
                onClick={() => update('agreed', !form.agreed)}
                className="w-full flex items-start gap-3 p-3 bg-[#111] border border-[#1f1f1f] rounded-xl hover:border-[#ef4444]/30 transition-all mb-6 text-left"
              >
                <div className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                  form.agreed
                    ? 'bg-[#ef4444] border-[#ef4444]'
                    : 'border-[#71767b]'
                )}>
                  {form.agreed && <Check className="w-3 h-3 text-white" />}
                </div>
                <p className="text-xs text-[#71767b] leading-relaxed">
                  I understand that upgrading to a Tipster account is <span className="text-white font-bold">permanent</span> and
                  I agree to the Tipster Code of Conduct. I accept full responsibility for all predictions I post.
                </p>
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  disabled={submitting}
                  className="flex-1 py-3 border border-[#1f1f1f] rounded-full text-sm font-bold text-[#71767b] hover:border-white hover:text-white transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleBecomeTipster}
                  disabled={!canProceedStep3 || submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold py-3 rounded-full hover:opacity-90 transition-all disabled:opacity-40 shadow-lg shadow-red-500/20"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4" />
                      Create Tipster Account — Free
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-[#71767b] text-center mt-4 leading-relaxed">
                This action cannot be undone. Your account will be permanently upgraded to a Tipster account.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
