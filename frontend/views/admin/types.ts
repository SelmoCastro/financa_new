/**
 * Arquivo de apoio da camada de views; define tipos, hooks ou utilitários usados pelas telas principais.
 */
export interface Stats {
  users: { total: number; verified: number };
  transactions: number;
  accounts: number;
  budgets: number;
  goals: number;
  categories: number;
  creditCards: number;
  feedbacks: number;
  aiRequests: number;
  notifications: number;
  invites: number;
  dbSizeBytes: number;
}

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  subscription: {
    plan: string;
    status: string;
    expiresAt: string | null;
  } | null;
  _count: {
    transactions: number;
    accounts: number;
    budgets: number;
    goals: number;
    aiRequestLogs: number;
    feedbacks: number;
  };
}

export interface PlanStatsData {
  plans: { free: number; premium: number; total: number };
  lifetimeUsers: number;
  expiringSoon: Array<{
    userId: string;
    plan: string;
    expiresAt: string;
    user: { name: string; email: string };
  }>;
}

export interface ActivityData {
  last30Days: {
    newUsers: number;
    newTransactions: number;
    aiRequestCount: number;
  };
  recentFeedbacks: Array<{
    id: string;
    content: string;
    platform: string;
    createdAt: string;
    user: { name: string; email: string };
  }>;
  topAiUsers: Array<{
    id: string;
    name: string;
    email: string;
    requestCount: number;
  }>;
}

export interface HealthData {
  database: {
    status: string;
    activeConnections: number;
    uptimeSeconds: number;
    activeUsers30d: number;
  };
}

export interface ResellerRow {
  id: string;
  email: string;
  displayName: string;
  companyName: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  creditVersion: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByAdminId: string | null;
  currentBalance: number;
  ledgerEntriesCount: number;
  premiumActivationsCount: number;
}

export interface ResellerLedgerEntry {
  id: string;
  resellerId: string;
  entryType: string;
  deltaCredits: number;
  balanceAfter: number;
  reason: string;
  notes: string;
  referenceType: string | null;
  referenceId: string | null;
  idempotencyKey: string | null;
  createdByAdminId: string | null;
  createdAt: string;
}

export interface ResellerActivation {
  id: string;
  resellerId: string;
  targetUserId: string;
  targetUserEmailSnapshot: string;
  targetUserNameSnapshot: string | null;
  lookupEmail: string;
  sku: string;
  creditsConsumed: number;
  durationDays: number;
  startsAt: string;
  expiresAt: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface ResellerDetailData {
  reseller: Omit<ResellerRow, 'currentBalance' | 'ledgerEntriesCount' | 'premiumActivationsCount'>;
  currentBalance: number;
  createdByAdmin: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  recentLedger: ResellerLedgerEntry[];
  recentActivations: ResellerActivation[];
}

export type Tab =
  | 'overview'
  | 'users'
  | 'plans'
  | 'activity'
  | 'health'
  | 'resellers';
