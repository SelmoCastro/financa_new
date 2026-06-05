import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const MASTER_KEY_STORE_KEY = 'offline_data_encryption_key_v1';
const ENVELOPE_PREFIX = 'enc:v1';

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getRandomBytes(size: number) {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Secure random generator unavailable');
  }
  return cryptoApi.getRandomValues(new Uint8Array(size));
}

async function getOrCreateMasterKey() {
  const existing = await SecureStore.getItemAsync(MASTER_KEY_STORE_KEY);
  if (existing) return existing;

  const generated = bytesToHex(getRandomBytes(32));
  await SecureStore.setItemAsync(MASTER_KEY_STORE_KEY, generated);
  return generated;
}

async function getDerivedKeys() {
  const masterKey = await getOrCreateMasterKey();
  return {
    encKey: CryptoJS.SHA256(`${masterKey}:enc`),
    macKey: CryptoJS.SHA256(`${masterKey}:mac`),
  };
}

function safeStringify(value: unknown) {
  return JSON.stringify(value);
}

export async function encryptString(value: string | null | undefined) {
  if (value == null) return null;
  if (value.startsWith(`${ENVELOPE_PREFIX}:`)) return value;

  const { encKey, macKey } = await getDerivedKeys();
  const iv = CryptoJS.enc.Hex.parse(bytesToHex(getRandomBytes(16)));
  const encrypted = CryptoJS.AES.encrypt(value, encKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const ivBase64 = CryptoJS.enc.Base64.stringify(iv);
  const cipherBase64 = CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
  const payload = `v1:${ivBase64}:${cipherBase64}`;
  const mac = CryptoJS.HmacSHA256(payload, macKey).toString(CryptoJS.enc.Hex);
  return `${ENVELOPE_PREFIX}:${ivBase64}:${cipherBase64}:${mac}`;
}

export async function decryptString(value: string | null | undefined) {
  if (value == null) return null;
  if (!value.startsWith(`${ENVELOPE_PREFIX}:`)) return value;

  const parts = value.split(':');
  if (parts.length !== 5) {
    throw new Error('Invalid encrypted payload format');
  }

  const [, version, ivBase64, cipherBase64, mac] = parts;
  if (version !== 'v1') {
    throw new Error(`Unsupported encrypted payload version: ${version}`);
  }

  const { encKey, macKey } = await getDerivedKeys();
  const payload = `${version}:${ivBase64}:${cipherBase64}`;
  const expectedMac = CryptoJS.HmacSHA256(payload, macKey).toString(CryptoJS.enc.Hex);
  if (expectedMac !== mac) {
    throw new Error('Encrypted payload integrity check failed');
  }

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: CryptoJS.enc.Base64.parse(cipherBase64) } as CryptoJS.lib.CipherParams,
    encKey,
    {
      iv: CryptoJS.enc.Base64.parse(ivBase64),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  );

  return CryptoJS.enc.Utf8.stringify(decrypted);
}

export async function setEncryptedItem(key: string, value: string) {
  await AsyncStorage.setItem(key, (await encryptString(value)) as string);
}

export async function getEncryptedItem(key: string) {
  const raw = await AsyncStorage.getItem(key);
  return decryptString(raw);
}

export async function removeEncryptedItem(key: string) {
  await AsyncStorage.removeItem(key);
}

export async function setEncryptedJson<T extends JsonValue>(key: string, value: T) {
  await setEncryptedItem(key, safeStringify(value));
}

export async function getEncryptedJson<T extends JsonValue>(key: string): Promise<T | null> {
  const raw = await getEncryptedItem(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}
