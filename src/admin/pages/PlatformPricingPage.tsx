import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  DEFAULT_PLATFORM_PRICING,
  formatNgn,
  type PlatformPricing,
} from '../../config/platformPricing';
import { platformPricingService } from '../../services/pricing/PlatformPricingService';
import { DashboardCard } from '../../dashboard/shared/DashboardComponents';

function Field({
  label,
  desc,
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
  step,
}: {
  label: string;
  desc?: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-[#71767b] mb-1 block">{label}</label>
      {desc && <p className="text-[10px] text-[#71767b] mb-2 leading-relaxed">{desc}</p>}
      <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-xl px-4 py-2.5">
        {prefix && <span className="text-[#71767b] font-bold text-sm shrink-0">{prefix}</span>}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-white outline-none"
        />
        {suffix && <span className="text-[#71767b] font-bold text-sm shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

export default function PlatformPricingPage() {
  const [form, setForm] = useState<PlatformPricing>(DEFAULT_PLATFORM_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    platformPricingService.getPricing().then(setForm).finally(() => setLoading(false));
  }, []);

  const set = (key: keyof PlatformPricing, value: string) => {
    setForm((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await platformPricingService.updatePricing({
        tipsterRegistrationFeeNgn: form.tipsterRegistrationFeeNgn,
        subscriptionCommissionPercent: form.subscriptionCommissionPercent,
        predictionCommissionPercent: form.predictionCommissionPercent,
        payoutProcessingFeePercent: form.payoutProcessingFeePercent,
        minChannelPriceNgn: form.minChannelPriceNgn,
        maxChannelPriceNgn: form.maxChannelPriceNgn,
        defaultChannelPriceNgn: form.defaultChannelPriceNgn,
      });
      setForm(updated);
      setToast('Platform pricing saved');
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast('Failed to save pricing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 rounded-full border-4 border-[#ef4444] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 pb-mobile-nav md:pb-8">
      <div>
        <p className="text-xs font-bold text-[#ef4444] uppercase tracking-wider mb-1">Admin</p>
        <h1 className="text-xl sm:text-2xl font-black text-white">Platform Pricing & Commissions</h1>
        <p className="text-xs text-[#71767b] mt-1">
          Controls tipster registration fees and Arena commission rates across the platform.
        </p>
      </div>

      <DashboardCard title="Tipster Registration">
        <div className="space-y-4">
          <Field
            label="Tipster account creation fee"
            desc="One-time charge when a user upgrades to tipster. Shown on the Become Tipster flow."
            prefix="₦"
            value={String(form.tipsterRegistrationFeeNgn)}
            onChange={(v) => set('tipsterRegistrationFeeNgn', v)}
            min={0}
            step={500}
          />
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Users pay this once before their tipster account is activated. Set to 0 for free registration during promotions.</span>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Commission Rates">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="VIP subscription commission"
            desc="Arena's share of monthly channel subscription revenue"
            suffix="%"
            value={String(form.subscriptionCommissionPercent)}
            onChange={(v) => set('subscriptionCommissionPercent', v)}
            min={0}
            max={50}
            step={0.5}
          />
          <Field
            label="Paid prediction commission"
            desc="Arena's share on one-off premium predictions"
            suffix="%"
            value={String(form.predictionCommissionPercent)}
            onChange={(v) => set('predictionCommissionPercent', v)}
            min={0}
            max={50}
            step={0.5}
          />
          <Field
            label="Payout processing fee"
            desc="Deducted when tipsters withdraw earnings"
            suffix="%"
            value={String(form.payoutProcessingFeePercent)}
            onChange={(v) => set('payoutProcessingFeePercent', v)}
            min={0}
            max={10}
            step={0.5}
          />
        </div>

        <div className="mt-4 p-4 rounded-xl bg-[#0d0d0d] border border-[#1f1f1f] space-y-2 text-xs">
          <p className="text-[#71767b] font-bold uppercase tracking-wider">Preview — ₦10,000 subscription</p>
          <div className="flex justify-between text-[#71767b]">
            <span>Gross</span>
            <span className="text-white">{formatNgn(10000)}</span>
          </div>
          <div className="flex justify-between text-[#71767b]">
            <span>Arena commission ({form.subscriptionCommissionPercent}%)</span>
            <span className="text-[#ef4444]">−{formatNgn(Math.round(10000 * form.subscriptionCommissionPercent / 100))}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-white">Tipster receives</span>
            <span className="text-green-400">{formatNgn(Math.round(10000 * (1 - form.subscriptionCommissionPercent / 100)))}</span>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Channel Price Limits">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Minimum VIP price"
            prefix="₦"
            value={String(form.minChannelPriceNgn)}
            onChange={(v) => set('minChannelPriceNgn', v)}
            min={0}
          />
          <Field
            label="Default VIP price"
            prefix="₦"
            value={String(form.defaultChannelPriceNgn)}
            onChange={(v) => set('defaultChannelPriceNgn', v)}
            min={0}
          />
          <Field
            label="Maximum VIP price"
            prefix="₦"
            value={String(form.maxChannelPriceNgn)}
            onChange={(v) => set('maxChannelPriceNgn', v)}
            min={0}
          />
        </div>
      </DashboardCard>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-colors',
          'bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50'
        )}
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : 'Save Platform Pricing'}
      </button>

      <p className="text-[10px] text-[#71767b] text-center">
        Last updated: {new Date(form.updatedAt).toLocaleString()}
      </p>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-green-600 text-white text-sm font-bold shadow-xl"
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
}
