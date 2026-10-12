export const FREE_QUOTA_LIMITS = {
  chat: 5,
  scan: 3,
  bulk: 2,
} as const;

export type QuotaFeature = keyof typeof FREE_QUOTA_LIMITS;

export interface QuotaState {
  chat: number;
  scan: number;
  bulk: number;
}

export const getQuotaKey = (d: Date = new Date()): string => {
  return `quota_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
