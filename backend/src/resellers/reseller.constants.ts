/**
 * Arquivo de suporte do domínio de revendedores e créditos; dá sustentação ao fluxo principal deste módulo.
 */
export const RESELLER_STATUSES = [
  'active',
  'suspended',
  'disabled',
] as const;

export type ResellerStatus = (typeof RESELLER_STATUSES)[number];

export const RESELLER_LEDGER_ENTRY_TYPES = [
  'credit_grant',
  'premium_activation',
  'adjustment_credit',
  'adjustment_debit',
] as const;

export type ResellerLedgerEntryType =
  (typeof RESELLER_LEDGER_ENTRY_TYPES)[number];

export const RESELLER_PREMIUM_SKUS = [
  'premium_monthly_credit',
  'premium_quarterly_credit',
  'premium_semiannual_credit',
  'premium_annual_credit',
] as const;

export type ResellerPremiumSku = (typeof RESELLER_PREMIUM_SKUS)[number];

export const RESELLER_SKU_CONFIG: Record<
  ResellerPremiumSku,
  { credits: number; durationDays: number; label: string }
> = {
  premium_monthly_credit: {
    credits: 1,
    durationDays: 30,
    label: 'Premium mensal',
  },
  premium_quarterly_credit: {
    credits: 3,
    durationDays: 90,
    label: 'Premium trimestral',
  },
  premium_semiannual_credit: {
    credits: 6,
    durationDays: 180,
    label: 'Premium semestral',
  },
  premium_annual_credit: {
    credits: 12,
    durationDays: 365,
    label: 'Premium anual',
  },
};

export const RESELLER_ACCESS_COOKIE = 'reseller_access_token';
export const RESELLER_REFRESH_COOKIE = 'reseller_refresh_token';
