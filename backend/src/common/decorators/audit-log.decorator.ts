import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit:log';

export interface AuditLogMetadata {
  action: string;
  targetType?: string;
  severity?: 'info' | 'warn' | 'critical';
}

/**
 * Decorator to mark endpoints for audit logging.
 * Usage: @AuditLog({ action: 'transaction.create', targetType: 'Transaction' })
 */
export const AuditLog = (metadata: AuditLogMetadata) =>
  SetMetadata(AUDIT_LOG_KEY, metadata);
