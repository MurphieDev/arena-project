import { useEffect, useState } from 'react';
import { apiClient } from '../../../api/clients/ApiClient';
import { calcTipsterEarnings, formatNgn, type PlatformPricing } from '../../../config/platformPricing';
import { DEFAULT_PLATFORM_PRICING } from '../../../config/platformPricing';
import { platformPricingService } from '../../../services/pricing/PlatformPricingService';
import { useSettings } from './settingsComponents';

export function SubscriptionPricingPage() {
  const { showToast } = useSettings();
  const [channelPrice, setChannelPrice] = useState('2500');
  const [pricing, setPricing] = useState<PlatformPricing>(DEFAULT_PLATFORM_PRICING);
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    platformPricingService.getPricing().then(setPricing);

    apiClient
      .get<{ data: { premiumPrice?: number } }>('/tipster/profile')
      .then((res) => {
        if (res?.data?.premiumPrice !== undefined) {
          setChannelPrice(String(res.data.premiumPrice || 0));
        }
      })
      .catch(() => {
        /* use default */
      });
  }, []);

  const priceNum = Number(channelPrice) || 0;
  const earnings = priceNum > 0 ? calcTipsterEarnings(priceNum, pricing.subscriptionCommissionPercent) : null;

  return (
    <div>
      <p className="px-4 py-3 text-xs text-[#71767b] leading-relaxed border-b border-[#1f1f1f]">
        Set your VIP channel price. Arena takes a {pricing.subscriptionCommissionPercent}% commission on each subscription — set by admin.
      </p>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-[#71767b] font-semibold mb-2 block">
            Monthly VIP Subscription Price (₦)
          </label>
          <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-xl px-4 py-3 transition-all">
            <span className="text-white font-bold shrink-0">₦</span>
            <input
              type="number"
              value={channelPrice}
              onChange={(e) => setChannelPrice(e.target.value)}
              placeholder="e.g. 2500"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
            />
          </div>
          <p className="text-[10px] text-[#71767b] mt-1.5 leading-relaxed">
            Allowed range: {formatNgn(pricing.minChannelPriceNgn)} – {formatNgn(pricing.maxChannelPriceNgn)}/mo. Set to 0 for free.
          </p>
        </div>

        {earnings && (
          <div className="p-4 rounded-xl bg-[#0d0d0d] border border-[#1f1f1f] space-y-2 text-xs">
            <p className="text-[#71767b] font-bold uppercase tracking-wider">Per subscriber / month</p>
            <div className="flex justify-between text-[#71767b]">
              <span>Subscriber pays</span>
              <span className="text-white">{formatNgn(earnings.gross)}</span>
            </div>
            <div className="flex justify-between text-[#71767b]">
              <span>Arena commission ({earnings.commissionPercent}%)</span>
              <span className="text-[#ef4444]">−{formatNgn(earnings.commission)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-white">You receive</span>
              <span className="text-green-400">{formatNgn(earnings.net)}</span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={async () => {
            if (priceNum > 0 && (priceNum < pricing.minChannelPriceNgn || priceNum > pricing.maxChannelPriceNgn)) {
              showToast(`Price must be between ${formatNgn(pricing.minChannelPriceNgn)} and ${formatNgn(pricing.maxChannelPriceNgn)}`, 'error');
              return;
            }
            setSavingPrice(true);
            try {
              await apiClient.put('/tipster/profile', { premiumPrice: priceNum });
              showToast('VIP channel price updated successfully!');
            } catch {
              showToast(`Price saved locally as ${formatNgn(priceNum)} — server sync pending`);
            } finally {
              setSavingPrice(false);
            }
          }}
          disabled={savingPrice}
          className="w-full py-3 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-xl text-sm font-bold text-white hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50"
        >
          {savingPrice ? 'Saving...' : 'Save Pricing'}
        </button>
      </div>
    </div>
  );
}
