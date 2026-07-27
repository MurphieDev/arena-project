// src/services/pricing/PlatformPricingService.ts
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_PLATFORM_PRICING, type PlatformPricing, formatNgn } from '../../config/platformPricing';

export const platformPricingService = {

  // Get current platform pricing from Firestore (admin can update)
  async getPricing(): Promise<PlatformPricing> {
    try {
      const snap = await getDoc(doc(db, 'platform', 'pricing'));
      if (snap.exists()) {
        return { ...DEFAULT_PLATFORM_PRICING, ...snap.data() } as PlatformPricing;
      }
      return DEFAULT_PLATFORM_PRICING;
    } catch {
      return DEFAULT_PLATFORM_PRICING;
    }
  },

  // Get registration fee (used in BecomeTipsterPage)
  async getRegistrationFee(): Promise<number> {
    const pricing = await this.getPricing();
    return pricing.tipsterRegistrationFeeNgn;
  },

  // Get formatted registration fee string
  async getFormattedRegistrationFee(): Promise<string> {
    const fee = await this.getRegistrationFee();
    return formatNgn(fee);
  },

  // Calculate what tipster earns after commission
  calcEarnings(channelPrice: number, pricing: PlatformPricing) {
    const commission = Math.round((channelPrice * pricing.subscriptionCommissionPercent) / 100);
    return {
      gross: channelPrice,
      commission,
      net: channelPrice - commission,
      formattedGross: formatNgn(channelPrice),
      formattedCommission: formatNgn(commission),
      formattedNet: formatNgn(channelPrice - commission),
      commissionPercent: pricing.subscriptionCommissionPercent,
    };
  },

  // Admin only: update pricing - returns updated pricing
  async updatePricing(updates: Partial<PlatformPricing>): Promise<PlatformPricing> {
    await setDoc(doc(db, 'platform', 'pricing'), {
      ...updates,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return this.getPricing();
  },
};
