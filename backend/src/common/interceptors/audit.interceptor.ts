/**
 * Interceptor compartilhado do backend; transforma ou enriquece a resposta/requisição de forma transversal.
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import {
  AUDIT_LOG_KEY,
  AuditLogMetadata,
} from '../decorators/audit-log.decorator';
import { AuditService } from '../../audit/audit.service';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: { userId: string; email: string };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    return next.handle().pipe(
      tap((result) => {
        // Fire-and-forget: audit logging never blocks the response
        this.auditService
          .log({
            action: metadata.action,
            actorId: user?.userId || null,
            targetType: metadata.targetType || null,
            targetId: this.extractTargetId(request, result),
            details: {
              method: request.method,
              url: request.originalUrl,
              params: request.params,
            } as any,
            ip: (request.ip ||
              (Array.isArray(request.headers['x-forwarded-for'])
                ? request.headers['x-forwarded-for'][0]
                : request.headers['x-forwarded-for']) ||
              null) as string,
            userAgent: request.headers['user-agent'] || null,
            severity: metadata.severity || 'info',
          })
          .catch((err) => {
            this.logger.error(
              `Audit log failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
      }),
    );
  }

  private extractTargetId(
    request: RequestWithUser,
    result: any,
  ): string | null {
    // Try to extract the ID from URL params first
    if (request.params?.id) return String(request.params.id);

    // Then from the response body
    if (result?.data?.id) return result.data.id;
    if (result?.id) return result.id;

    return null;
  }
}
