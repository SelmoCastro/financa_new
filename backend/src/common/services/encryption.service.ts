import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * EncryptionService — Application-Level Encryption (AES-256-GCM)
 *
 * Cifra campos sensíveis antes de persistir no Postgres, garantindo que
 * nem o administrador do banco de dados veja os valores reais.
 *
 * Formato encriptado: enc:<version>:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 * Suporta rotação de chaves via ENCRYPTION_KEYS (multi-version).
 *
 * Uso:
 *   this.encryption.encrypt('texto sensível')          → 'enc:v1:abc123...'
 *   this.encryption.decrypt('enc:v1:abc123...')         → 'texto sensível'
 *   this.encryption.encryptDecimal(1234.56)             → 'enc:v1:def456...'
 *   this.encryption.decryptDecimal('enc:v1:def456...') → 1234.56
 */

export interface EncryptionKeyConfig {
  version: string;
  key: string; // hex-encoded 256-bit key
}

@Injectable()
export class EncryptionService implements OnModuleInit {
  private keys: Map<string, Buffer> = new Map();
  private currentVersion: string;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_BYTES = 12; // 96-bit IV for GCM
  private readonly TAG_BYTES = 16; // 128-bit auth tag
  private readonly PREFIX = 'enc:';
  private enabled = false;

  onModuleInit() {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const encryptionKeys = process.env.ENCRYPTION_KEYS;

    if (!encryptionKey && !encryptionKeys) {
      console.warn(
        '⚠️  [EncryptionService] ENCRYPTION_KEY não definida — criptografia de campos desabilitada. ' +
        'Dados financeiros serão armazenados em plaintext.',
      );
      this.enabled = false;
      return;
    }

    // Multi-key rotation support via ENCRYPTION_KEYS env var
    // Format: v1:hex64key1,v2:hex64key2
    if (encryptionKeys) {
      const configs = encryptionKeys.split(',').map((entry) => {
        const [version, key] = entry.trim().split(':');
        if (!version || !key || key.length !== 64) {
          throw new Error(
            `ENCRYPTION_KEYS formato inválido: "${entry}". Esperado: "v1:64hexchars,v2:64hexchars"`,
          );
        }
        return { version, key } as EncryptionKeyConfig;
      });

      for (const config of configs) {
        this.keys.set(config.version, Buffer.from(config.key, 'hex'));
      }

      // Last key in the list is the current (encryption) key
      this.currentVersion = configs[configs.length - 1].version;
    } else {
      // Single key mode via ENCRYPTION_KEY
      if (!encryptionKey || encryptionKey.length !== 64) {
        throw new Error(
          `ENCRYPTION_KEY deve ter 256 bits (64 hex chars). Atual: ${encryptionKey?.length ?? 0} chars`,
        );
      }
      this.currentVersion = 'v1';
      this.keys.set('v1', Buffer.from(encryptionKey!, 'hex'));
    }

    this.enabled = true;
    console.log(
      `🔐 [EncryptionService] Ativo com ${this.keys.size} chave(s). Versão atual: ${this.currentVersion}`,
    );
  }

  /** Whether encryption is active (ENCRYPTION_KEY was provided) */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Encrypt a plaintext string using AES-256-GCM.
   * Returns format: enc:<version>:<iv_hex>:<authTag_hex>:<ciphertext_hex>
   * Returns null if input is null/undefined.
   */
  encrypt(plaintext: string | null | undefined): string | null {
    if (!this.enabled) return plaintext as string | null;
    if (plaintext === null || plaintext === undefined) return null;

    const iv = crypto.randomBytes(this.IV_BYTES);
    const key = this.keys.get(this.currentVersion);
    if (!key) {
      throw new Error(`Chave de encriptação não encontrada para versão ${this.currentVersion}`);
    }

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${this.PREFIX}${this.currentVersion}:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
  }

  /**
   * Decrypt an AES-256-GCM encrypted string.
   * Accepts format: enc:<version>:<iv_hex>:<authTag_hex>:<ciphertext_hex>
   * If not prefixed with 'enc:', returns as-is (plaintext fallback for migration).
   */
  decrypt(encrypted: string | null | undefined): string | null {
    if (!this.enabled) return encrypted as string | null;
    if (encrypted === null || encrypted === undefined) return null;
    if (!encrypted.startsWith(this.PREFIX)) {
      // Plaintext fallback — data not yet migrated
      return encrypted;
    }

    const parts = encrypted.split(':');
    if (parts.length !== 5 || parts[0] !== 'enc') {
      throw new Error('Formato de dados encriptados inválido');
    }

    const [, version, ivHex, authTagHex, ciphertext] = parts;
    const key = this.keys.get(version);
    if (!key) {
      throw new Error(
        `Chave de decriptação não encontrada para versão ${version}. ` +
        `Chaves disponíveis: ${Array.from(this.keys.keys()).join(', ')}`,
      );
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    // If data was encrypted with an old key version, re-encrypt with current key
    // This is handled transparently on the next write cycle
    return plaintext;
  }

  /**
   * Encrypt a Decimal/number value for financial fields.
   * Preserves null/undefined.
   * Stores as fixed-point string to avoid floating point precision loss.
   */
  encryptDecimal(value: number | string | null | undefined): string | null {
    if (!this.enabled) {
      if (value === null || value === undefined) return null;
      return String(value);
    }
    if (value === null || value === undefined) return null;
    // CRITICAL: never encrypt NaN — it destroys the balance permanently
    const normalized = typeof value === 'number' ? value.toFixed(2) : String(value);
    if (normalized === 'NaN' || normalized === 'null' || normalized === 'undefined') {
      console.error('[EncryptionService] encryptDecimal received invalid value: ' + String(value) + ' — storing as "0.00"');
      return this.encrypt('0.00');
    }
    return this.encrypt(normalized);
  }

  /**
   * Decrypt an encrypted Decimal back to a string (for Prisma Decimal compatibility).
   * Returns null for null input.
   * Returns the original string if not encrypted (migration fallback).
   */
  decryptDecimal(encrypted: string | null | undefined): string | null {
    if (!this.enabled) return encrypted as string | null;
    if (encrypted === null || encrypted === undefined) return null;
    if (!encrypted.startsWith(this.PREFIX)) {
      // Plaintext fallback — return as-is (migration still in progress)
      return encrypted;
    }
    return this.decrypt(encrypted);
  }

  /**
   * Check if a value is currently encrypted.
   */
  isEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;
    return value.startsWith(this.PREFIX);
  }

  /**
   * Re-encrypt data that was encrypted with an old key version.
   * Called after rotating keys to migrate data to the new key.
   */
  reEncrypt(encrypted: string | null | undefined): string | null {
    if (!encrypted || !encrypted.startsWith(this.PREFIX)) return encrypted as string | null;
    // Decrypt with whatever version it was encrypted with
    const plaintext = this.decrypt(encrypted);
    // Re-encrypt with current key version
    return this.encrypt(plaintext);
  }

  /**
   * Get the current key version (useful for migration tracking).
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }
}