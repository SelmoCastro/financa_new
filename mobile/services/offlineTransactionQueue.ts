import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import api from './api';
import { buildScopedCacheKey, getCachedJson, setCachedJson } from './cache';
import { deleteLocalEntity, deleteQueueItem, enqueueOfflineMutation, upsertLocalEntity } from './localDb';
import { getEncryptedJson, setEncryptedJson } from './secureLocalData';
import { Transaction } from '../types';

const QUEUE_PREFIX = '@finanza:offline-transaction-queue';
const SYNC_EVENT = 'transactions:offline-queue-synced';

type OfflineTransactionCreatePayload = {
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: number;
  categoryId?: string;
  categoryLegacy?: string;
  date: string;
  isFixed?: boolean;
  accountId?: string;
  creditCardId?: string;
  sharedWithEmail?: string;
};

type OfflineTransactionTransferPayload = {
  type: 'TRANSFER';
  description: string;
  amount: number;
  date: string;
  sourceAccountId: string;
  destinationAccountId: string;
};

type OfflineTransactionPayload = OfflineTransactionCreatePayload | OfflineTransactionTransferPayload;

type PendingCreateItem = {
  id: string;
  kind: 'create';
  endpoint: '/transactions';
  payload: OfflineTransactionCreatePayload;
  createdAt: string;
  localTransactionIds: [string];
};

type PendingTransferItem = {
  id: string;
  kind: 'transfer';
  endpoint: '/transactions/transfer';
  payload: OfflineTransactionTransferPayload;
  createdAt: string;
  localTransactionIds: [string, string];
};

type PendingQueueItem = PendingCreateItem | PendingTransferItem;
type QueueState = PendingQueueItem[];

function makeLocalId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getQueueKey() {
  const userId = await SecureStore.getItemAsync('userId');
  return `${QUEUE_PREFIX}:${userId || 'guest'}`;
}

function normalizeQueueItem(item: any): PendingQueueItem | null {
  if (!item || typeof item !== 'object' || typeof item.id !== 'string') return null;

  if (item.kind === 'create' && item.endpoint === '/transactions' && item.payload && typeof item.payload.description === 'string') {
    return {
      id: item.id,
      kind: 'create',
      endpoint: '/transactions',
      payload: item.payload,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      localTransactionIds: Array.isArray(item.localTransactionIds) && item.localTransactionIds.length > 0 ? [String(item.localTransactionIds[0])] : [item.id],
    };
  }

  if (item.kind === 'transfer' && item.endpoint === '/transactions/transfer' && item.payload && typeof item.payload.sourceAccountId === 'string') {
    let localTransactionIds: [string, string];
    if (Array.isArray(item.localTransactionIds) && item.localTransactionIds.length === 2) {
      localTransactionIds = [String(item.localTransactionIds[0]), String(item.localTransactionIds[1])] as [string, string];
    } else {
      localTransactionIds = [`${item.id}:out`, `${item.id}:in`] as [string, string];
    }

    return {
      id: item.id,
      kind: 'transfer',
      endpoint: '/transactions/transfer',
      payload: item.payload,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      localTransactionIds,
    };
  }

  // Legacy queue format from the first offline implementation: create-only items without `kind`.
  if (item.endpoint === '/transactions' && item.payload && typeof item.payload.description === 'string') {
    return {
      id: item.id,
      kind: 'create',
      endpoint: '/transactions',
      payload: item.payload,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      localTransactionIds: [item.id],
    };
  }

  return null;
}

async function readQueue(): Promise<QueueState> {
  try {
    const parsed = await getEncryptedJson<unknown[]>(await getQueueKey());
    if (!parsed) return [];
    return Array.isArray(parsed) ? parsed.map(normalizeQueueItem).filter((item): item is PendingQueueItem => Boolean(item)) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueueState) {
  await setEncryptedJson(await getQueueKey(), queue as unknown[]);
}

async function getTransactionsCacheKey() {
  return buildScopedCacheKey('get', '/transactions');
}

async function readTransactionsCache(): Promise<Transaction[]> {
  const cacheKey = await getTransactionsCacheKey();
  return (await getCachedJson<Transaction[]>(cacheKey)) ?? [];
}

async function writeTransactionsCache(transactions: Transaction[]) {
  const cacheKey = await getTransactionsCacheKey();
  await setCachedJson(cacheKey, transactions);
}

function buildOptimisticCreateTransaction(payload: OfflineTransactionCreatePayload, localId: string): Transaction {
  const categoryName = payload.categoryLegacy || 'Outros';
  return {
    id: localId,
    description: payload.description,
    amount: payload.amount,
    type: payload.type,
    date: payload.date,
    category: payload.categoryId
      ? {
          id: payload.categoryId,
          name: categoryName,
          type: payload.type,
          color: '#64748b',
          icon: 'receipt-long',
        }
      : undefined,
    categoryLegacy: payload.categoryLegacy,
    isFixed: Boolean(payload.isFixed),
    accountId: payload.accountId,
    creditCardId: payload.creditCardId,
    userId: '',
    createdAt: payload.date,
    updatedAt: new Date().toISOString(),
    pendingSync: true,
    offlineLocalId: localId,
  } as Transaction;
}

function buildOptimisticTransferTransactions(payload: OfflineTransactionTransferPayload, localId: string): Transaction[] {
  const description = payload.description || 'Transferência';
  const transferCategory = {
    id: `offline-transfer-${localId}`,
    name: 'Transferência',
    type: 'TRANSFER',
    color: '#6366f1',
    icon: 'swap-horiz',
  };

  const sharedBase = {
    category: transferCategory,
    categoryLegacy: 'Transferência',
    isFixed: false,
    userId: '',
    createdAt: payload.date,
    updatedAt: new Date().toISOString(),
    pendingSync: true,
    offlineLocalId: localId,
    offlineTransferGroupId: localId,
    transferGroupId: localId,
  } as const;

  return [
    {
      id: `${localId}:out`,
      description: `${description} (Saída)`,
      amount: payload.amount,
      type: 'EXPENSE',
      date: payload.date,
      accountId: payload.sourceAccountId,
      transferRole: 'source',
      ...sharedBase,
    } as Transaction,
    {
      id: `${localId}:in`,
      description: `${description} (Entrada)`,
      amount: payload.amount,
      type: 'INCOME',
      date: payload.date,
      accountId: payload.destinationAccountId,
      transferRole: 'destination',
      ...sharedBase,
    } as Transaction,
  ];
}

function buildOptimisticTransactions(payload: OfflineTransactionPayload, localId: string): Transaction[] {
  if (payload.type === 'TRANSFER') {
    return buildOptimisticTransferTransactions(payload, localId);
  }

  return [buildOptimisticCreateTransaction(payload, localId)];
}

function buildQueueItem(payload: OfflineTransactionPayload, localId: string, createdAt = new Date().toISOString()): PendingQueueItem {
  if (payload.type === 'TRANSFER') {
    const localTransactionIds: [string, string] = [`${localId}:out`, `${localId}:in`];
    return {
      id: localId,
      kind: 'transfer',
      endpoint: '/transactions/transfer',
      payload,
      createdAt,
      localTransactionIds,
    };
  }

  return {
    id: localId,
    kind: 'create',
    endpoint: '/transactions',
    payload,
    createdAt,
    localTransactionIds: [localId],
  };
}

async function persistPendingMutationInLocalDb(item: PendingQueueItem, optimisticTransactions: Transaction[]) {
  try {
    await enqueueOfflineMutation({
      id: item.id,
      entityType: 'transaction',
      operation: item.kind === 'transfer' ? 'transfer' : 'create',
      endpoint: item.endpoint,
      method: 'POST',
      payload: item.payload,
      localEntityId: item.id,
    });

    await Promise.all(
      optimisticTransactions.map((transaction) =>
        upsertLocalEntity({
          id: transaction.id,
          entityType: 'transaction',
          data: transaction,
          pendingSync: true,
        })
      )
    );
  } catch (error) {
    if (__DEV__) {
      console.warn('[offlineTransactionQueue] Falha ao persistir pendência no SQLite local:', error);
    }
  }
}

async function removePendingMutationFromLocalDb(item: PendingQueueItem) {
  try {
    await deleteQueueItem(item.id);
    await Promise.all(item.localTransactionIds.map((localId) => deleteLocalEntity(localId)));
  } catch (error) {
    if (__DEV__) {
      console.warn('[offlineTransactionQueue] Falha ao limpar pendência do SQLite local:', error);
    }
  }
}

async function replaceLocalTransactions(localId: string, nextTransactions: Transaction[]) {
  const current = await readTransactionsCache();
  const filtered = current.filter((item) => item.offlineLocalId !== localId && item.id !== localId && item.offlineTransferGroupId !== localId);
  const next = [...nextTransactions, ...filtered];
  await writeTransactionsCache(next);
  return next;
}

async function removeLocalTransactions(localId: string) {
  const current = await readTransactionsCache();
  const next = current.filter((item) => item.offlineLocalId !== localId && item.id !== localId && item.offlineTransferGroupId !== localId);
  await writeTransactionsCache(next);
  return next;
}

async function queueOfflineMutation(payload: OfflineTransactionPayload) {
  const localId = makeLocalId();
  const optimisticTransactions = buildOptimisticTransactions(payload, localId);
  const queue = await readQueue();
  const queueItem = buildQueueItem(payload, localId);
  queue.unshift(queueItem);

  // A fila é a fonte de verdade do offline. Se a atualização do cache falhar,
  // ainda assim preservamos o item enfileirado para sincronizar depois.
  await writeQueue(queue);
  await persistPendingMutationInLocalDb(queueItem, optimisticTransactions);

  try {
    await replaceLocalTransactions(localId, optimisticTransactions);
  } catch (error) {
    if (__DEV__) {
      console.warn('[offlineTransactionQueue] Falha ao atualizar cache local após enfileirar:', error);
    }
  }

  return optimisticTransactions;
}

async function queueOfflineTransaction(payload: OfflineTransactionCreatePayload) {
  return queueOfflineMutation(payload);
}

async function queueOfflineTransfer(payload: OfflineTransactionTransferPayload) {
  return queueOfflineMutation(payload);
}

async function getPendingTransactionCount() {
  const queue = await readQueue();
  return queue.length;
}

async function getPendingOptimisticTransactions() {
  const queue = await readQueue();
  return queue.flatMap((item) => buildOptimisticTransactions(item.payload, item.id));
}

async function getPendingOfflineMutationSnapshot(localId: string) {
  const queue = await readQueue();
  const item = queue.find((entry) => entry.id === localId);
  if (!item) return null;

  if (item.kind === 'create') {
    const cached = await readTransactionsCache();
    return cached.find((transaction) => transaction.offlineLocalId === localId) ?? buildOptimisticCreateTransaction(item.payload, localId);
  }

  return {
    id: localId,
    description: item.payload.description,
    amount: item.payload.amount,
    type: 'TRANSFER',
    date: item.payload.date,
    category: {
      id: `offline-transfer-${localId}`,
      name: 'Transferência',
      type: 'TRANSFER',
      color: '#6366f1',
      icon: 'swap-horiz',
    },
    categoryLegacy: 'Transferência',
    isFixed: false,
    accountId: item.payload.sourceAccountId,
    destinationAccountId: item.payload.destinationAccountId,
    sourceAccountId: item.payload.sourceAccountId,
    userId: '',
    createdAt: item.createdAt,
    updatedAt: new Date().toISOString(),
    pendingSync: true,
    offlineLocalId: localId,
    offlineTransferGroupId: localId,
    transferGroupId: localId,
  };
}

async function updatePendingOfflineMutation(localId: string, payload: OfflineTransactionPayload) {
  const queue = await readQueue();
  const index = queue.findIndex((entry) => entry.id === localId);
  if (index === -1) {
    throw new Error('Lançamento offline não encontrado para atualização');
  }

  const optimisticTransactions = buildOptimisticTransactions(payload, localId);
  const current = queue[index];
  const queueItem = buildQueueItem(payload, localId, current.createdAt);
  queue[index] = queueItem;
  await writeQueue(queue);
  await persistPendingMutationInLocalDb(queueItem, optimisticTransactions);

  try {
    await replaceLocalTransactions(localId, optimisticTransactions);
  } catch (error) {
    if (__DEV__) {
      console.warn('[offlineTransactionQueue] Falha ao atualizar cache local após editar pendência:', error);
    }
  }

  return optimisticTransactions;
}

async function removePendingOfflineMutation(localId: string) {
  const queue = await readQueue();
  const removedItem = queue.find((entry) => entry.id === localId);
  const next = queue.filter((entry) => entry.id !== localId);
  if (next.length === queue.length) {
    return false;
  }

  await writeQueue(next);
  if (removedItem) await removePendingMutationFromLocalDb(removedItem);

  try {
    await removeLocalTransactions(localId);
  } catch (error) {
    if (__DEV__) {
      console.warn('[offlineTransactionQueue] Falha ao limpar cache local ao remover pendência:', error);
    }
  }

  return true;
}

async function syncPendingTransactionQueue() {
  const queue = await readQueue();
  if (queue.length === 0) {
    return { synced: 0, remaining: 0, errors: [] };
  }

  let synced = 0;
  let remaining = [...queue];
  const errors: { itemId: string; description: string; error: string; status?: number }[] = [];

  for (const item of queue) {
    try {
      const postResponse = await api.post(item.endpoint, item.payload);
      synced += 1;
      remaining = remaining.filter((pending) => pending.id !== item.id);
      await writeQueue(remaining);

      // Substitui o item otimista pelo real no cache local, sem depender de um GET posterior
      if (item.kind === 'create' && postResponse?.data?.id) {
        const realTransaction: Transaction = postResponse.data;
        await replaceLocalTransactions(item.id, [realTransaction]);
      } else {
        // Fallback: remove do cache (transferências ou resposta inesperada)
        await removeLocalTransactions(item.id);
      }

      await removePendingMutationFromLocalDb(item);
    } catch (error: any) {
      const status = error?.response?.status;
      const code = error?.code;
      const responseData = error?.response?.data;
      const errorMessage =
        (typeof responseData === 'string' ? responseData : responseData?.message) ||
        error?.message ||
        'Erro desconhecido';

      // Network/unstable error: keep item in queue, stop loop
      if (status == null || code === 'ERR_NETWORK' || code === 'ECONNABORTED') {
        errors.push({ itemId: item.id, description: item.payload.description, error: errorMessage, status });
        break;
      }

      // HTTP error (4xx/5xx): capture message, remove item from queue, continue with next
      errors.push({ itemId: item.id, description: item.payload.description, error: errorMessage, status });
      remaining = remaining.filter((pending) => pending.id !== item.id);
      await writeQueue(remaining);
      await removeLocalTransactions(item.id);
      await removePendingMutationFromLocalDb(item);
    }
  }

  if (synced > 0) {
    // O SYNC_EVENT dispara fetchTransactions() nos listeners, que busca dados frescos
    // Não fazemos api.get() aqui para evitar race condition com cache offline
    DeviceEventEmitter.emit(SYNC_EVENT);
  }

  return { synced, remaining: remaining.length, errors };
}

export const offlineTransactionQueue = {
  queueOfflineMutation,
  queueOfflineTransaction,
  queueOfflineTransfer,
  getPendingTransactionCount,
  getPendingOptimisticTransactions,
  getPendingOfflineMutationSnapshot,
  updatePendingOfflineMutation,
  removePendingOfflineMutation,
  syncPendingTransactionQueue,
  syncEvent: SYNC_EVENT,
};
