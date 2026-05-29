import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import api from './api';

const QUEUE_PREFIX = '@finanza:offline-recurring-queue';

type RecurringCreatePayload = {
  description: string;
  amount: number;
  type: string;
  dueDay: number;
  startMonth?: number;
  endMonth?: number | null;
  categoryId?: string | null;
  accountId?: string | null;
  creditCardId?: string | null;
};

type RecurringUpdatePayload = RecurringCreatePayload;

type PendingRecurringItem = {
  id: string;
  kind: 'create' | 'update' | 'delete';
  recurringId?: string;
  payload: RecurringCreatePayload | RecurringUpdatePayload | null;
  createdAt: string;
};

type QueueState = PendingRecurringItem[];

function makeLocalId() {
  return `recurring-local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getQueueKey() {
  const userId = await SecureStore.getItemAsync('userId');
  return `${QUEUE_PREFIX}:${userId || 'guest'}`;
}

async function readQueue(): Promise<QueueState> {
  const raw = await AsyncStorage.getItem(await getQueueKey());
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueueState) {
  await AsyncStorage.setItem(await getQueueKey(), JSON.stringify(queue));
}

async function queueRecurringCreate(payload: RecurringCreatePayload) {
  const localId = makeLocalId();
  const queue = await readQueue();
  
  const item: PendingRecurringItem = {
    id: localId,
    kind: 'create',
    payload,
    createdAt: new Date().toISOString(),
  };
  
  queue.unshift(item);
  await writeQueue(queue);
  
  return { localId, item };
}

async function queueRecurringUpdate(recurringId: string, payload: RecurringUpdatePayload) {
  const localId = makeLocalId();
  const queue = await readQueue();
  
  const item: PendingRecurringItem = {
    id: localId,
    kind: 'update',
    recurringId,
    payload,
    createdAt: new Date().toISOString(),
  };
  
  queue.unshift(item);
  await writeQueue(queue);
  
  return { localId, item };
}

async function queueRecurringDelete(recurringId: string) {
  const localId = makeLocalId();
  const queue = await readQueue();
  
  const item: PendingRecurringItem = {
    id: localId,
    kind: 'delete',
    recurringId,
    payload: null,
    createdAt: new Date().toISOString(),
  };
  
  queue.unshift(item);
  await writeQueue(queue);
  
  return { localId, item };
}

async function getPendingRecurringCount() {
  const queue = await readQueue();
  return queue.length;
}

async function syncPendingRecurringQueue() {
  const queue = await readQueue();
  if (queue.length === 0) {
    return { synced: 0, remaining: 0 };
  }

  let synced = 0;
  let remaining = [...queue];

  for (const item of queue) {
    try {
      if (item.kind === 'create' && item.payload) {
        await api.post('/recurring-transactions', item.payload);
      } else if (item.kind === 'update' && item.recurringId && item.payload) {
        await api.patch(`/recurring-transactions/${item.recurringId}`, item.payload);
      } else if (item.kind === 'delete' && item.recurringId) {
        await api.delete(`/recurring-transactions/${item.recurringId}`);
      }
      
      synced += 1;
      remaining = remaining.filter((pending) => pending.id !== item.id);
      await writeQueue(remaining);
    } catch (error: any) {
      const status = error?.response?.status;
      const code = error?.code;

      // Keep the item in the queue when the network is unstable
      if (status == null || code === 'ERR_NETWORK' || code === 'ECONNABORTED') {
        break;
      }

      // For 4xx/5xx errors, also keep in queue for retry
      break;
    }
  }

  return { synced, remaining: remaining.length };
}

export const offlineRecurringQueue = {
  queueRecurringCreate,
  queueRecurringUpdate,
  queueRecurringDelete,
  getPendingRecurringCount,
  syncPendingRecurringQueue,
};
