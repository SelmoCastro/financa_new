import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Production Security Logger — structured audit logging for all requests.
 *
 * Logs method, URL, status, duration, and IP for:
 * - All 4xx/5xx responses (security incidents)
 * - All mutating requests (POST/PUT/PATCH/DELETE)
 * - All auth-related endpoints
 *
 * Does NOT log request bodies (may contain passwords/PII).
 * Does NOT log response bodies.
 */
@Injectable()
export class SecurityLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('SECURITY');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;
    const ip = this.getClientIp(req);

    // Only log after response completes
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const isMutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);
      const isError = status >= 400;
      const isAuthRoute = originalUrl.includes('/auth/');

      // Only log: errors, mutations, auth routes, and slow requests (>5s)
      if (isError || isMutating || isAuthRoute || duration > 5000) {
        const severity = status >= 500 ? 'CRITICAL' : status >= 400 ? 'WARN' : 'INFO';
        this.logger.log(
          `${severity} ${method} ${this.sanitizeUrl(originalUrl)} ${status} ${duration}ms ip=${ip}`
        );
      }
    });

    next();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return (req.headers['x-real-ip'] as string) || req.ip || 'unknown';
  }

  private sanitizeUrl(url: string): string {
    return url.replace(
      /([?&](?:token|refreshToken|access_token|password|email)=)[^&]*/gi,
      '$1[REDACTED]',
    );
  }
}
