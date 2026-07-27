// src/config/platformPricing.ts

export interface PlatformPricing {
  tipsterRegistrationFeeNgn: number;
  subscriptionCommissionPercent: number;
  predictionCommissionPercent: number;
  payoutProcessingFeePercent: number;
  minChannelPriceNgn: number;
  maxChannelPriceNgn: number;
  defaultChannelPriceNgn: number;
  updatedAt: string;
}

export const DEFAULT_PLATFORM_PRICING: PlatformPricing = {
  tipsterRegistrationFeeNgn: 5000,
  subscriptionCommissionPercent: 10,
  predictionCommissionPercent: 10,
  payoutProcessingFeePercent: 1.5,
  minChannelPriceNgn: 500,
  maxChannelPriceNgn: 50000,
  defaultChannelPriceNgn: 2500,
  updatedAt: new Date().toISOString(),
};

export function calcTipsterEarnings(price: number, commissionPercent: number) {
  const commission = Math.round((price * commissionPercent) / 100);
  return {
    gross: price,
    commission,
    net: price - commission,
    commissionPercent,
  };
}

export function formatNgn(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}
