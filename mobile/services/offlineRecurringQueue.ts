import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';
import api from './api';
import {
  deleteLocalEntity,
  deleteQueueItem,
  enqueueOfflineMutation,
  listLocalEntities,
  upsertLocalEntity,
} from './localDb';

const QUEUE_PREFIX = '@finanza:offline-recurring-queue';
const syncEvent = 'offlineRecurringQueue:syncComplete';

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

type OptimisticRecurring = {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  dueDay: number;
  startMonth: number;
  endMonth: number | null;
  isActive: boolean;
  categoryId: string | null;
  accountId: string | null;
  creditCardId: string | null;
  category: any;
  account: any;
  creditCard: any;
  pendingSync?: boolean;
  offlineLocalId?: string;
};

function toOptimisticRecurring(localId: string, payload: RecurringCreatePayload, existing?: Partial<OptimisticRecurring>): OptimisticRecurring {
  return {
    id: existing?.id || localId,
    description: payload.description,
    amount: Number(payload.amount) || 0,
    type: payload.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
    dueDay: Number(payload.dueDay) || 1,
    startMonth: payload.startMonth || existing?.startMonth || new Date().getMonth() + 1,
    endMonth: payload.endMonth ?? existing?.endMonth ?? null,
    isActive: existing?.isActive ?? true,
    categoryId: payload.categoryId ?? existing?.categoryId ?? null,
    accountId: payload.accountId ?? existing?.accountId ?? null,
    creditCardId: payload.creditCardId ?? existing?.creditCardId ?? null,
    category: existing?.category ?? null,
    account: existing?.account ?? null,
    creditCard: existing?.creditCard ?? null,
    pendingSync: true,
    offlineLocalId: localId,
  };
}

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

  const optimistic = toOptimisticRecurring(localId, payload);
  await upsertLocalEntity({ id: localId, entityType: 'recurring', data: optimistic, pendingSync: true });
  await enqueueOfflineMutation({
    id: localId,
    entityType: 'recurring',
    operation: 'create',
    endpoint: '/recurring-transactions',
    method: 'POST',
    payload,
    localEntityId: localId,
  });
  
  return { localId, item, optimistic };
}

async function queueRecurringUpdate(recurringId: string, payload: RecurringUpdatePayload, existing?: Partial<OptimisticRecurring>) {
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

  const optimistic = toOptimisticRecurring(localId, payload, { ...existing, id: recurringId });
  await upsertLocalEntity({ id: localId, entityType: 'recurring', serverId: recurringId, data: optimistic, pendingSync: true });
  await enqueueOfflineMutation({
    id: localId,
    entityType: 'recurring',
    operation: 'update',
    endpoint: `/recurring-transactions/${recurringId}`,
    method: 'PATCH',
    payload,
    localEntityId: localId,
  });
  
  return { localId, item, optimistic };
}

async function queueRecurringDelete(recurringId: string, existing?: Partial<OptimisticRecurring>) {
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

  const optimistic = existing?.description
    ? { ...existing, id: recurringId, pendingSync: true, offlineLocalId: localId } as OptimisticRecurring
    : null;
  if (optimistic) {
    await upsertLocalEntity({ id: localId, entityType: 'recurring', serverId: recurringId, data: optimistic, pendingSync: true, deletedLocally: true });
  }
  await enqueueOfflineMutation({
    id: localId,
    entityType: 'recurring',
    operation: 'delete',
    endpoint: `/recurring-transactions/${recurringId}`,
    method: 'DELETE',
    localEntityId: optimistic ? localId : undefined,
  });
  
  return { localId, item };
}

async function getPendingRecurringCount() {
  const queue = await readQueue();
  return queue.length;
}

async function getPendingOptimisticRecurring() {
  const rows = await listLocalEntities<OptimisticRecurring>('recurring', { includeDeleted: true });
  return rows
    .filter((row) => row.pending_sync === 1 && row.deleted_locally === 0 && row.data)
    .map((row) => ({ ...(row.data as OptimisticRecurring), pendingSync: true, offlineLocalId: row.id }));
}

async function getDeletedRecurringIds() {
  const rows = await listLocalEntities<OptimisticRecurring>('recurring', { includeDeleted: true });
  return rows
    .filter((row) => row.pending_sync === 1 && row.deleted_locally === 1 && row.server_id)
    .map((row) => row.server_id as string);
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
      await deleteQueueItem(item.id).catch(() => {});
      await deleteLocalEntity(item.id).catch(() => {});
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

  if (synced > 0) DeviceEventEmitter.emit(syncEvent);
  return { synced, remaining: remaining.length };
}

export const offlineRecurringQueue = {
  syncEvent,
  queueRecurringCreate,
  queueRecurringUpdate,
  queueRecurringDelete,
  getPendingRecurringCount,
  getPendingOptimisticRecurring,
  getDeletedRecurringIds,
  syncPendingRecurringQueue,
};
