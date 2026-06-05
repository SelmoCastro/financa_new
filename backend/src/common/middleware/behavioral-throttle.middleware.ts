import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * BehavioralThrottleMiddleware — Adaptive rate limiting based on client behavior.
 *
 * Works alongside the existing ThrottlerGuard (100 req/60s global) by adding
 * a secondary behavior-based penalty layer:
 *
 * - IPs with high error rates (4xx/5xx) get progressively throttled
 * - After 5 errors in 5 min: 2x penalty (50 req/60s effective)
 * - After 10 errors in 5 min: 4x penalty (25 req/60s effective)
 * - After 20+ errors in 5 min: 8x penalty (12 req/60s effective)
 * - Penalties decay: each successful request reduces error count by 0.5
 * - Stale entries cleaned every 10 minutes
 *
 * Returns 429 with retry-after header when behavioral limit is exceeded.
 * Place BEFORE the rate limiter in middleware chain.
 */
@Injectable()
export class BehavioralThrottleMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BehavioralThrottleMiddleware.name);

  // Track error counts per IP — public for admin monitoring
  public ipTracker = new Map<string, {
    errorCount: number;
    lastActivity: number;
    penaltyUntil: number;
    totalRequests: number;
    windowStart: number;
  }>();

  // Cleanup stale entries every 10 minutes
  private cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);

  /** Base limit per window (must match ThrottlerGuard) */
  private readonly BASE_LIMIT = 100;
  private readonly WINDOW_MS = 60 * 1000; // 60 seconds

  use(req: Request, res: Response, next: NextFunction): void {
    const ip = this.getClientIp(req);
    const tracker = this.getOrCreateTracker(ip);

    // Reset per-minute request counter. Without this, totalRequests grows until
    // cleanup and a penalized IP can stay blocked far longer than intended.
    const now = Date.now();
    if (now - tracker.windowStart >= this.WINDOW_MS) {
      tracker.totalRequests = 0;
      tracker.windowStart = now;
    }

    // Check if IP is currently penalized
    if (now < tracker.penaltyUntil) {
      const multiplier = this.calculateMultiplier(tracker.errorCount);
      const effectiveLimit = Math.max(1, Math.floor(this.BASE_LIMIT / multiplier));

      if (tracker.totalRequests >= effectiveLimit) {
        const retryAfter = Math.ceil((tracker.penaltyUntil - Date.now()) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        res.setHeader('X-RateLimit-Limit', String(effectiveLimit));
        res.setHeader('X-RateLimit-Penalty', String(multiplier));
        res.status(429).json({
          statusCode: 429,
          message: 'Too many requests — behavioral limit exceeded. Reduce error rates.',
          error: 'Too Many Requests',
        });
        return;
      }
    }

    tracker.totalRequests++;
    tracker.lastActivity = Date.now();

    // Track response status
    // Excluir 401/404 do contador de erros:
    // - 401 já é coberto por throttles específicos de auth/refresh
    // - 404 não indica abuso, apenas recurso inexistente
    res.on('finish', () => {
      if (res.statusCode >= 400 && res.statusCode !== 401 && res.statusCode !== 404) {
        this.onError(ip);
      } else {
        this.onSuccess(ip);
      }
    });

    next();
  }

  /**
   * Expose the tracker for external monitoring/debugging.
   */
  getTrackerStats(ip: string) {
    return this.ipTracker.get(ip);
  }

  private onError(ip: string): void {
    const tracker = this.getOrCreateTracker(ip);
    tracker.errorCount++;
    tracker.lastActivity = Date.now();

    // Progressive penalty
    const multiplier = this.calculateMultiplier(tracker.errorCount);
    const penaltyDuration = Math.min(5 * 60 * 1000, 30 * 1000 * multiplier);
    tracker.penaltyUntil = Date.now() + penaltyDuration;

    this.ipTracker.set(ip, tracker);
  }

  private onSuccess(ip: string): void {
    const tracker = this.ipTracker.get(ip);
    if (tracker && tracker.errorCount > 0) {
      // Decay: reduce error count on success
      tracker.errorCount = Math.max(0, tracker.errorCount - 0.5);
      this.ipTracker.set(ip, tracker);
    }
  }

  private calculateMultiplier(errorCount: number): number {
    if (errorCount >= 20) return 8;
    if (errorCount >= 10) return 4;
    if (errorCount >= 5) return 2;
    return 1;
  }

  private getOrCreateTracker(ip: string) {
    let tracker = this.ipTracker.get(ip);
    if (!tracker) {
      tracker = {
        errorCount: 0,
        lastActivity: Date.now(),
        penaltyUntil: 0,
        totalRequests: 0,
        windowStart: Date.now(),
      };
      this.ipTracker.set(ip, tracker);
    }
    return tracker;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] as string || req.ip || req.connection.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    const entries = Array.from(this.ipTracker.entries());
    for (const [ip, data] of entries) {
      if (now - data.lastActivity > maxAge && now > data.penaltyUntil) {
        this.ipTracker.delete(ip);
      }
    }
  }
}