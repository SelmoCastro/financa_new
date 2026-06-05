import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getEncryptedJson, removeEncryptedItem, setEncryptedJson } from './secureLocalData';

const CACHE_PREFIX = '@finanza:api-cache';
const CACHE_INDEX_PREFIX = '@finanza:api-cache-index';

type CacheEnvelope<T> = {
  value: T;
  savedAt: number;
  ttlMs?: number;
};

function normalizePart(part: string) {
  return part.replace(/[^a-zA-Z0-9._~-]/g, '_');
}

async function getScopeKey() {
  const userId = await SecureStore.getItemAsync('userId');
  return normalizePart(userId ?? 'guest');
}

function serializeParams(params?: Record<string, unknown>) {
  if (!params || Object.keys(params).length === 0) return '';

  const sortedEntries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const normalized = sortedEntries.map(([key, value]) => [key, value] as const);
  return JSON.stringify(normalized);
}

export async function buildScopedCacheKey(method: string, url?: string, params?: Record<string, unknown>) {
  const scope = await getScopeKey();
  const cleanMethod = normalizePart((method || 'get').toLowerCase());
  const cleanUrl = normalizePart(url || 'unknown');
  const query = serializeParams(params);
  return `${CACHE_PREFIX}:${scope}:${cleanMethod}:${cleanUrl}:${query}`;
}

async function getIndexKey() {
  const scope = await getScopeKey();
  return `${CACHE_INDEX_PREFIX}:${scope}`;
}

async function readIndex(): Promise<string[]> {
  try {
    const parsed = await getEncryptedJson<unknown[]>(await getIndexKey());
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function writeIndex(keys: string[]) {
  const unique = Array.from(new Set(keys));
  await setEncryptedJson(await getIndexKey(), unique);
}

async function trackKey(cacheKey: string) {
  const keys = await readIndex();
  if (!keys.includes(cacheKey)) {
    keys.push(cacheKey);
    await writeIndex(keys);
  }
}

async function untrackKey(cacheKey: string) {
  const keys = await readIndex();
  const filtered = keys.filter((item) => item !== cacheKey);
  if (filtered.length !== keys.length) {
    await writeIndex(filtered);
  }
}

export async function setCachedJson<T>(cacheKey: string, value: T, ttlMs?: number) {
  const envelope: CacheEnvelope<T> = {
    value,
    savedAt: Date.now(),
    ttlMs,
  };

  await setEncryptedJson(cacheKey, envelope as unknown as Record<string, unknown>);
  await trackKey(cacheKey);
}

export async function getCachedJson<T>(cacheKey: string): Promise<T | null> {
  try {
    const parsed = await getEncryptedJson<CacheEnvelope<T> & Record<string, unknown>>(cacheKey);
    if (!parsed) return null;
    if (parsed?.ttlMs && Date.now() - parsed.savedAt > parsed.ttlMs) {
      await removeCachedJson(cacheKey);
      return null;
    }

    return parsed?.value ?? null;
  } catch {
    return null;
  }
}

export async function removeCachedJson(cacheKey: string) {
  await removeEncryptedItem(cacheKey);
  await untrackKey(cacheKey);
}

export async function clearCurrentUserApiCache() {
  const keys = await readIndex();
  await Promise.all(keys.map((key) => AsyncStorage.removeItem(key)));
  await AsyncStorage.removeItem(await getIndexKey());
}
