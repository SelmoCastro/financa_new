import { DeviceEventEmitter } from 'react-native';
import api from './api';
import {
  deleteLocalEntity,
  deleteQueueItem,
  enqueueOfflineMutation,
  listLocalEntities,
  listPendingQueue,
  markQueueFailed,
  upsertLocalEntity,
} from './localDb';
import { Budget } from '../types';

export type OfflineBudget = Budget & {
  pendingSync?: boolean;
  offlineLocalId?: string;
};

type BudgetPayload = {
  categoryId: string;
  amount: number;
  categoryObj?: Budget['categoryObj'];
};

const ENTITY_TYPE = 'budget' as const;
const syncEvent = 'offlineBudgetQueue:syncComplete';

function makeLocalId() {
  return `budget-local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toOptimisticBudget(localId: string, payload: BudgetPayload, existing?: Partial<Budget>): OfflineBudget {
  const amount = Number(payload.amount) || 0;
  const spent = Number(existing?.spent) || 0;
  const percentage = amount > 0 ? (spent / amount) * 100 : 0;

  return {
    id: existing?.id || localId,
    amount,
    categoryId: payload.categoryId,
    categoryObj: payload.categoryObj || existing?.categoryObj || { id: payload.categoryId, name: 'Categoria', icon: 'savings' },
    spent,
    percentage,
    isOverBudget: percentage >= 100,
    pendingSync: true,
    offlineLocalId: localId,
  };
}

async function queueBudgetCreate(payload: BudgetPayload) {
  const localId = makeLocalId();
  const optimistic = toOptimisticBudget(localId, payload);

  await upsertLocalEntity({
    id: localId,
    entityType: ENTITY_TYPE,
    data: optimistic,
    pendingSync: true,
  });

  await enqueueOfflineMutation({
    id: localId,
    entityType: ENTITY_TYPE,
    operation: 'create',
    endpoint: '/budgets',
    method: 'POST',
    payload: { categoryId: payload.categoryId, amount: payload.amount },
    localEntityId: localId,
  });

  return optimistic;
}

async function queueBudgetUpdate(budget: Budget, payload: BudgetPayload) {
  const localId = makeLocalId();
  const optimistic = toOptimisticBudget(localId, payload, budget);

  await upsertLocalEntity({
    id: localId,
    entityType: ENTITY_TYPE,
    serverId: budget.id,
    data: optimistic,
    pendingSync: true,
  });

  await enqueueOfflineMutation({
    id: localId,
    entityType: ENTITY_TYPE,
    operation: 'update',
    endpoint: `/budgets/${budget.id}`,
    method: 'PATCH',
    payload: { categoryId: payload.categoryId, amount: payload.amount },
    localEntityId: localId,
  });

  return optimistic;
}

async function queueBudgetDelete(budget: Budget) {
  const localId = makeLocalId();
  const optimistic: OfflineBudget = { ...budget, pendingSync: true, offlineLocalId: localId };

  await upsertLocalEntity({
    id: localId,
    entityType: ENTITY_TYPE,
    serverId: budget.id,
    data: optimistic,
    pendingSync: true,
    deletedLocally: true,
  });

  await enqueueOfflineMutation({
    id: localId,
    entityType: ENTITY_TYPE,
    operation: 'delete',
    endpoint: `/budgets/${budget.id}`,
    method: 'DELETE',
    localEntityId: localId,
  });

  return localId;
}

async function getPendingOptimisticBudgets() {
  const rows = await listLocalEntities<OfflineBudget>(ENTITY_TYPE, { includeDeleted: true });
  return rows
    .filter((row) => row.pending_sync === 1 && row.deleted_locally === 0 && row.data)
    .map((row) => ({ ...(row.data as OfflineBudget), pendingSync: true, offlineLocalId: row.id }));
}

async function getDeletedBudgetIds() {
  const rows = await listLocalEntities<OfflineBudget>(ENTITY_TYPE, { includeDeleted: true });
  return rows
    .filter((row) => row.pending_sync === 1 && row.deleted_locally === 1 && row.server_id)
    .map((row) => row.server_id as string);
}

async function getPendingBudgetCount() {
  const rows = await listPendingQueue([ENTITY_TYPE]);
  return rows.length;
}

async function syncPendingBudgetQueue() {
  const queue = await listPendingQueue([ENTITY_TYPE]);
  let synced = 0;

  for (const item of queue) {
    try {
      const payload = item.payload_json ? JSON.parse(item.payload_json) : undefined;

      if (item.method === 'POST') {
        await api.post(item.endpoint, payload);
      } else if (item.method === 'PATCH') {
        await api.patch(item.endpoint, payload);
      } else if (item.method === 'DELETE') {
        await api.delete(item.endpoint);
      }

      await deleteQueueItem(item.id);
      if (item.local_entity_id) await deleteLocalEntity(item.local_entity_id);
      synced += 1;
    } catch (error: any) {
      const message = error?.message || 'Erro ao sincronizar orçamento';
      await markQueueFailed(item.id, message);

      const status = error?.response?.status;
      const code = error?.code;
      if (status == null || code === 'ERR_NETWORK' || code === 'ECONNABORTED') break;
      break;
    }
  }

  if (synced > 0) DeviceEventEmitter.emit(syncEvent);
  return { synced, remaining: Math.max(queue.length - synced, 0) };
}

export const offlineBudgetQueue = {
  syncEvent,
  queueBudgetCreate,
  queueBudgetUpdate,
  queueBudgetDelete,
  getPendingOptimisticBudgets,
  getDeletedBudgetIds,
  getPendingBudgetCount,
  syncPendingBudgetQueue,
};
