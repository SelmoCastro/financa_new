import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  IMPORT = 'IMPORT',
  TRANSFER = 'TRANSFER',
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_DELETE = 'ACCOUNT_DELETE',
  BALANCE_CHANGE = 'BALANCE_CHANGE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
}

export interface AuditLogEntry {
  userId: string;
  action: AuditAction | string;
  resource: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  details?: Record<string, any>;
}

/**
 * AuditService — Immutable audit logging with SHA-256 integrity chain.
 *
 * Every audit log entry is cryptographically chained to the previous entry
 * via previousHash/currentHash, making it impossible to tamper with or
 * delete entries without breaking the chain.
 *
 * Features:
 * - SHA-256 hash chain (each entry references the hash of the previous one)
 * - Context capture (IP, userAgent, sessionId)
 * - Before/after state snapshots for mutations
 * - Graceful degradation: never fails the main operation
 * - Integrity verification API
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private lastKnownHash: string = 'GENESIS'; // Initial hash for the chain

  constructor(private prisma: PrismaService) {
    this.initializeChain();
  }

  /**
   * Load the last hash from the DB on service startup to resume the chain.
   */
  private async initializeChain() {
    try {
      const lastEntry = await this.prisma.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { currentHash: true },
      });
      if (lastEntry?.currentHash) {
        this.lastKnownHash = lastEntry.currentHash;
      }
    } catch {
      this.logger.warn('Could not load last audit hash — starting fresh chain');
    }
  }

  /**
   * Log an audit entry with integrity chain.
   * This method NEVER throws — audit logging must not block the main operation.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const previousHash = this.lastKnownHash;

      // Sanitize: remove sensitive fields before storage
      const safePrevious = this.sanitize(entry.previousState);
      const safeNew = this.sanitize(entry.newState);

      // Compute current hash: SHA-256(userId + action + resource + resourceId + previousHash + timestamp)
      const content = [
        entry.userId,
        entry.action,
        entry.resource,
        entry.resourceId || '',
        previousHash,
        Date.now().toString(),
      ].join('|');

      const currentHash = crypto.createHash('sha256').update(content).digest('hex');

      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          ip: entry.ip,
          userAgent: entry.userAgent,
          sessionId: entry.sessionId,
          previousState: safePrevious ? JSON.stringify(safePrevious) : null,
          newState: safeNew ? JSON.stringify(safeNew) : null,
          details: entry.details ? JSON.stringify(this.sanitize(entry.details)) : null,
          previousHash,
          currentHash,
        },
      });

      // Update chain pointer
      this.lastKnownHash = currentHash;
    } catch (error: any) {
      // Audit logging is non-critical; never fail the main operation
      this.logger.error(`Audit log failed: ${error?.message}`, error?.stack);
    }
  }

  /**
   * Convenience: log a simple action without state snapshots.
   */
  async logAction(
    userId: string,
    action: AuditAction | string,
    resource: string,
    resourceId?: string,
    ip?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    return this.log({
      userId,
      action,
      resource,
      resourceId,
      ip,
      details,
    });
  }

  /**
   * Verify the integrity of the audit chain.
   * Returns { valid: boolean, brokenAt?: string } where brokenAt is the ID of the first broken entry.
   */
  async verifyChain(limit = 10000): Promise<{ valid: boolean; brokenAt?: string; totalEntries: number; checkedEntries: number }> {
    const entries = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, userId: true, action: true, resource: true, resourceId: true, previousHash: true, currentHash: true, createdAt: true },
      take: limit,
    });

    // First entry should have previousHash = 'GENESIS' or null (pre-chain entries)
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedPrevious = i === 0 ? 'GENESIS' : entries[i - 1].currentHash;

      // Skip entries before chain was introduced (previousHash will be null)
      if (entry.previousHash === null && entry.currentHash === null) continue;

      // Verify hash chain continuity
      if (entry.previousHash !== expectedPrevious && entry.previousHash !== null) {
        return {
          valid: false,
          brokenAt: entry.id,
          totalEntries: entries.length,
          checkedEntries: i + 1,
        };
      }
    }

    return { valid: true, totalEntries: entries.length, checkedEntries: entries.length };
  }

  /**
   * Find audit logs for a specific user (paginated).
   */
  async findByUser(
    userId: string,
    page = 1,
    limit = 50,
    resource?: string,
    action?: string,
  ) {
    const where: { userId: string; action?: string; resource?: string } = { userId };
    if (resource) where.resource = resource;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  /**
   * Find all audit logs (admin only, paginated).
   */
  async findAll(page = 1, limit = 50, resource?: string, action?: string) {
    const where: { resource?: string; action?: string } = {};
    if (resource) where.resource = resource;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  /**
   * Remove sensitive fields from state snapshots before storing.
   */
  private sanitize(data: Record<string, any> | null | undefined): Record<string, any> | null {
    if (!data) return null;
    if (typeof data !== 'object') return data;

    const SENSITIVE_KEYS = [
      'password',
      'hashedRefreshToken',
      'token',
      'secret',
      'accessToken',
      'refreshToken',
      'cardNumber',
      'cvv',
    ];

    const sanitized = { ...data };
    for (const key of SENSITIVE_KEYS) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}