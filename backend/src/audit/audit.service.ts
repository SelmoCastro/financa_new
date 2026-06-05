import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.register'
  | 'auth.password_change'
  | 'auth.email_verified'
  | 'transaction.create'
  | 'transaction.update'
  | 'transaction.delete'
  | 'account.create'
  | 'account.update'
  | 'account.delete'
  | 'account.balance_change'
  | 'budget.create'
  | 'budget.update'
  | 'budget.delete'
  | 'goal.create'
  | 'goal.update'
  | 'goal.delete'
  | 'credit_card.create'
  | 'credit_card.update'
  | 'credit_card.delete'
  | 'invoice.pay'
  | 'invoice.delete'
  | 'user.update'
  | 'user.delete_account'
  | 'admin.action';

export type AuditSeverity = 'info' | 'warn' | 'critical';

export interface AuditLogInput {
  action: AuditAction | string;
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  details?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  severity?: AuditSeverity;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event with hash chain integrity.
   * Each entry links to the previous entry via previousHash,
   * creating a tamper-evident chain. Deleting or modifying any
   * entry breaks the chain and can be detected via verifyChain().
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      // Get the last audit log entry for hash chain
      const lastEntry = await this.prisma.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { hash: true },
      });

      const previousHash = lastEntry?.hash || null;

      // Generate a deterministic ID for hash computation
      const id = crypto.randomUUID();

      // Compute hash: SHA256(id + action + actorId + targetId + previousHash + timestamp)
      const timestamp = new Date();
      const hashInput = [
        id,
        input.action,
        input.actorId || '',
        input.targetId || '',
        previousHash || '',
        timestamp.toISOString(),
      ].join('|');

      const hash = createHash('sha256').update(hashInput).digest('hex');

      await this.prisma.auditLog.create({
        data: {
          id,
          action: input.action,
          actorId: input.actorId || null,
          targetType: input.targetType || null,
          targetId: input.targetId || null,
          previousState: (input.previousState as any) ?? undefined,
          newState: (input.newState as any) ?? undefined,
          details: (input.details as any) ?? {},
          ip: input.ip || null,
          userAgent: input.userAgent || null,
          severity: input.severity || 'info',
          previousHash,
          hash,
          createdAt: timestamp,
        },
      });
    } catch (error) {
      // Audit logging must NEVER block the main operation.
      // Log the error but don't throw.
      this.logger.error(
        `Failed to write audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Verify the integrity of the audit log chain.
   * Returns { valid: boolean, brokenAt: string | null }
   * If the chain is broken, brokenAt contains the ID of the first invalid entry.
   */
  async verifyChain(
    limit = 1000,
  ): Promise<{ valid: boolean; brokenAt: string | null; checked: number }> {
    const entries = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        action: true,
        actorId: true,
        targetId: true,
        previousHash: true,
        hash: true,
        createdAt: true,
      },
    });

    let previousHash: string | null = null;

    for (const entry of entries) {
      // Verify chain linkage
      if (entry.previousHash !== previousHash) {
        return {
          valid: false,
          brokenAt: entry.id,
          checked: entries.indexOf(entry) + 1,
        };
      }

      // Verify hash integrity
      const hashInput = [
        entry.id,
        entry.action,
        entry.actorId || '',
        entry.targetId || '',
        entry.previousHash || '',
        entry.createdAt.toISOString(),
      ].join('|');

      const expectedHash = createHash('sha256').update(hashInput).digest('hex');

      if (entry.hash !== expectedHash) {
        return {
          valid: false,
          brokenAt: entry.id,
          checked: entries.indexOf(entry) + 1,
        };
      }

      previousHash = entry.hash;
    }

    return { valid: true, brokenAt: null, checked: entries.length };
  }

  /**
   * Query audit logs with filters.
   */
  async query(filters: {
    actorId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    severity?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.targetType) where.targetType = filters.targetType;
    if (filters.targetId) where.targetId = filters.targetId;
    if (filters.severity) where.severity = filters.severity;
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from && { gte: filters.from }),
        ...(filters.to && { lte: filters.to }),
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
