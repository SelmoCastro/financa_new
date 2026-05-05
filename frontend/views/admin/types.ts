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

export type Tab = 'overview' | 'users' | 'plans' | 'activity' | 'health';