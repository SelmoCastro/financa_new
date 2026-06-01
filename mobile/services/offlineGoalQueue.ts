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
import { Goal } from '../types';

export type OfflineGoal = Goal & {
  pendingSync?: boolean;
  offlineLocalId?: string;
};

type GoalPayload = {
  title: string;
  targetAmount: number;
};

const ENTITY_TYPE = 'goal' as const;
const syncEvent = 'offlineGoalQueue:syncComplete';

function makeLocalId() {
  return `goal-local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toOptimisticGoal(localId: string, payload: GoalPayload, existing?: Partial<Goal>): OfflineGoal {
  const targetAmount = Number(payload.targetAmount) || 0;
  const currentAmount = Number(existing?.currentAmount) || 0;
  const progress = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;

  return {
    id: existing?.id || localId,
    title: payload.title,
    targetAmount,
    currentAmount,
    progress,
    remainingAmount: Math.max(targetAmount - currentAmount, 0),
    deadline: existing?.deadline,
    pendingSync: true,
    offlineLocalId: localId,
  };
}

function applyDeposit(goal: Goal, amount: number, localId: string): OfflineGoal {
  const currentAmount = (Number(goal.currentAmount) || 0) + amount;
  const targetAmount = Number(goal.targetAmount) || 0;
  const progress = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;

  return {
    ...goal,
    currentAmount,
    progress,
    remainingAmount: Math.max(targetAmount - currentAmount, 0),
    pendingSync: true,
    offlineLocalId: localId,
  };
}

async function queueGoalCreate(payload: GoalPayload) {
  const localId = makeLocalId();
  const optimistic = toOptimisticGoal(localId, payload);

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
    endpoint: '/goals',
    method: 'POST',
    payload,
    localEntityId: localId,
  });

  return optimistic;
}

async function queueGoalUpdate(goal: Goal, payload: GoalPayload) {
  const localId = makeLocalId();
  const optimistic = toOptimisticGoal(localId, payload, goal);

  await upsertLocalEntity({
    id: localId,
    entityType: ENTITY_TYPE,
    serverId: goal.id,
    data: optimistic,
    pendingSync: true,
  });

  await enqueueOfflineMutation({
    id: localId,
    entityType: ENTITY_TYPE,
    operation: 'update',
    endpoint: `/goals/${goal.id}`,
    method: 'PATCH',
    payload,
    localEntityId: localId,
  });

  return optimistic;
}

async function queueGoalDelete(goal: Goal) {
  const localId = makeLocalId();
  const optimistic: OfflineGoal = { ...goal, pendingSync: true, offlineLocalId: localId };

  await upsertLocalEntity({
    id: localId,
    entityType: ENTITY_TYPE,
    serverId: goal.id,
    data: optimistic,
    pendingSync: true,
    deletedLocally: true,
  });

  await enqueueOfflineMutation({
    id: localId,
    entityType: ENTITY_TYPE,
    operation: 'delete',
    endpoint: `/goals/${goal.id}`,
    method: 'DELETE',
    localEntityId: localId,
  });

  return localId;
}

async function queueGoalDeposit(goal: Goal, amount: number) {
  const localId = makeLocalId();
  const optimistic = applyDeposit(goal, amount, localId);

  await upsertLocalEntity({
    id: localId,
    entityType: ENTITY_TYPE,
    serverId: goal.id,
    data: optimistic,
    pendingSync: true,
  });

  await enqueueOfflineMutation({
    id: localId,
    entityType: ENTITY_TYPE,
    operation: 'deposit',
    endpoint: `/goals/${goal.id}/deposit`,
    method: 'POST',
    payload: { amount },
    localEntityId: localId,
  });

  return optimistic;
}

async function getPendingOptimisticGoals() {
  const rows = await listLocalEntities<OfflineGoal>(ENTITY_TYPE, { includeDeleted: true });
  return rows
    .filter((row) => row.pending_sync === 1 && row.deleted_locally === 0 && row.data)
    .map((row) => ({ ...(row.data as OfflineGoal), pendingSync: true, offlineLocalId: row.id }));
}

async function getDeletedGoalIds() {
  const rows = await listLocalEntities<OfflineGoal>(ENTITY_TYPE, { includeDeleted: true });
  return rows
    .filter((row) => row.pending_sync === 1 && row.deleted_locally === 1 && row.server_id)
    .map((row) => row.server_id as string);
}

async function getPendingGoalCount() {
  const rows = await listPendingQueue([ENTITY_TYPE]);
  return rows.length;
}

async function syncPendingGoalQueue() {
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
      const message = error?.message || 'Erro ao sincronizar meta';
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

export const offlineGoalQueue = {
  syncEvent,
  queueGoalCreate,
  queueGoalUpdate,
  queueGoalDelete,
  queueGoalDeposit,
  getPendingOptimisticGoals,
  getDeletedGoalIds,
  getPendingGoalCount,
  syncPendingGoalQueue,
};
