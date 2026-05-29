import api from './api';

let warmupPromise: Promise<void> | null = null;

const endpoints = [
  '/transactions',
  '/accounts',
  '/credit-cards',
  '/credit-cards/installments/all',
  '/categories',
  '/budgets',
  '/goals',
  '/recurring-transactions',
  '/recurring-transactions/weight',
  '/notifications',
  '/notifications/unread-count',
];

export function warmOfflineCache() {
  if (warmupPromise) return warmupPromise;

  warmupPromise = Promise.allSettled(endpoints.map((endpoint) => api.get(endpoint)))
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      warmupPromise = null;
    });

  return warmupPromise;
}
