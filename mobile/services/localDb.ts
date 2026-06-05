import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { decryptString, encryptString } from './secureLocalData';

const DB_NAME = 'finanza-offline.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export type OfflineEntityType = 'transaction' | 'recurring' | 'budget' | 'goal';
export type OfflineOperation = 'create' | 'update' | 'delete' | 'deposit' | 'transfer';
export type OfflineQueueStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type OfflineQueueRow = {
  id: string;
  user_id: string;
  entity_type: OfflineEntityType;
  operation: OfflineOperation;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  payload_json: string | null;
  local_entity_id: string | null;
  status: OfflineQueueStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type LocalEntityRow<T = unknown> = {
  id: string;
  user_id: string;
  entity_type: OfflineEntityType;
  server_id: string | null;
  data_json: string;
  pending_sync: number;
  deleted_locally: number;
  created_at: string;
  updated_at: string;
  data?: T;
};

function makeLocalId(prefix = 'local') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function getCurrentUserIdScope() {
  const userId = await SecureStore.getItemAsync('userId');
  return userId || 'guest';
}

export async function initLocalDb() {
  const db = await getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      operation TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload_json TEXT,
      local_entity_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_offline_queue_user_status
    ON offline_queue(user_id, status, created_at);

    CREATE TABLE IF NOT EXISTS local_entities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      server_id TEXT,
      data_json TEXT NOT NULL,
      pending_sync INTEGER NOT NULL DEFAULT 0,
      deleted_locally INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_local_entities_user_type
    ON local_entities(user_id, entity_type, updated_at);
  `);
}

export async function enqueueOfflineMutation(input: {
  entityType: OfflineEntityType;
  operation: OfflineOperation;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  payload?: unknown;
  localEntityId?: string;
  id?: string;
}) {
  await initLocalDb();
  const db = await getDb();
  const userId = await getCurrentUserIdScope();
  const now = new Date().toISOString();
  const id = input.id || makeLocalId(input.entityType);
  const encryptedPayload = input.payload === undefined
    ? null
    : await encryptString(JSON.stringify(input.payload));

  await db.runAsync(
    `INSERT OR REPLACE INTO offline_queue (
      id, user_id, entity_type, operation, endpoint, method, payload_json,
      local_entity_id, status, retry_count, last_error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?, ?)`,
    [
      id,
      userId,
      input.entityType,
      input.operation,
      input.endpoint,
      input.method,
      encryptedPayload,
      input.localEntityId ?? null,
      now,
      now,
    ]
  );

  return id;
}

async function decryptQueueRows(rows: OfflineQueueRow[]): Promise<OfflineQueueRow[]> {
  const results = await Promise.allSettled(
    rows.map(async (row) => ({
      ...row,
      payload_json: await decryptString(row.payload_json),
    })),
  );
  const decrypted: OfflineQueueRow[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      decrypted.push(result.value);
    }
  }
  return decrypted;
}

export async function listPendingQueue(entityTypes?: OfflineEntityType[]) {
  await initLocalDb();
  const db = await getDb();
  const userId = await getCurrentUserIdScope();
  let rows: OfflineQueueRow[];

  if (!entityTypes || entityTypes.length === 0) {
    rows = await db.getAllAsync<OfflineQueueRow>(
      `SELECT * FROM offline_queue WHERE user_id = ? AND status IN ('pending', 'failed') ORDER BY created_at ASC`,
      [userId]
    );
  } else {
    const placeholders = entityTypes.map(() => '?').join(', ');
    rows = await db.getAllAsync<OfflineQueueRow>(
      `SELECT * FROM offline_queue WHERE user_id = ? AND status IN ('pending', 'failed') AND entity_type IN (${placeholders}) ORDER BY created_at ASC`,
      [userId, ...entityTypes]
    );
  }

  return decryptQueueRows(rows);
}

export async function markQueueSynced(id: string) {
  await initLocalDb();
  const db = await getDb();
  await db.runAsync(
    `UPDATE offline_queue SET status = 'synced', updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
}

export async function markQueueFailed(id: string, error: string) {
  await initLocalDb();
  const db = await getDb();
  await db.runAsync(
    `UPDATE offline_queue
     SET status = 'failed', retry_count = retry_count + 1, last_error = ?, updated_at = ?
     WHERE id = ?`,
    [error, new Date().toISOString(), id]
  );
}

export async function deleteQueueItem(id: string) {
  await initLocalDb();
  const db = await getDb();
  await db.runAsync(`DELETE FROM offline_queue WHERE id = ?`, [id]);
}

export async function upsertLocalEntity<T>(input: {
  id?: string;
  entityType: OfflineEntityType;
  serverId?: string | null;
  data: T;
  pendingSync?: boolean;
  deletedLocally?: boolean;
}) {
  await initLocalDb();
  const db = await getDb();
  const userId = await getCurrentUserIdScope();
  const now = new Date().toISOString();
  const id = input.id || makeLocalId(input.entityType);
  const encryptedData = await encryptString(JSON.stringify(input.data));

  await db.runAsync(
    `INSERT INTO local_entities (
      id, user_id, entity_type, server_id, data_json, pending_sync,
      deleted_locally, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      server_id = excluded.server_id,
      data_json = excluded.data_json,
      pending_sync = excluded.pending_sync,
      deleted_locally = excluded.deleted_locally,
      updated_at = excluded.updated_at`,
    [
      id,
      userId,
      input.entityType,
      input.serverId ?? null,
      encryptedData,
      input.pendingSync ? 1 : 0,
      input.deletedLocally ? 1 : 0,
      now,
      now,
    ]
  );

  return id;
}

export async function listLocalEntities<T>(entityType: OfflineEntityType, options?: { includeDeleted?: boolean }) {
  await initLocalDb();
  const db = await getDb();
  const userId = await getCurrentUserIdScope();

  const rows = await db.getAllAsync<LocalEntityRow<T>>(
    `SELECT * FROM local_entities
     WHERE user_id = ? AND entity_type = ? ${options?.includeDeleted ? '' : 'AND deleted_locally = 0'}
     ORDER BY updated_at DESC`,
    [userId, entityType]
  );

  return Promise.all(
    rows.map(async (row) => {
      const decrypted = await decryptString(row.data_json);
      if (!decrypted) {
        return row;
      }

      try {
        return {
          ...row,
          data_json: decrypted,
          data: JSON.parse(decrypted) as T,
        };
      } catch {
        return {
          ...row,
          data_json: decrypted,
        };
      }
    }),
  );
}

export async function deleteLocalEntity(id: string) {
  await initLocalDb();
  const db = await getDb();
  await db.runAsync(`DELETE FROM local_entities WHERE id = ?`, [id]);
}

export async function clearCurrentUserLocalDb() {
  await initLocalDb();
  const db = await getDb();
  const userId = await getCurrentUserIdScope();
  await db.runAsync(`DELETE FROM offline_queue WHERE user_id = ?`, [userId]);
  await db.runAsync(`DELETE FROM local_entities WHERE user_id = ?`, [userId]);
}
