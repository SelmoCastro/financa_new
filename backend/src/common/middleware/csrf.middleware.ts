import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF Protection via Double-Submit Cookie pattern.
 *
 * Como funciona:
 * 1. Na primeira request (ou se o cookie nao existe), gera um CSRF token e seta como cookie.
 * 2. Para requests de escrita (POST/PUT/PATCH/DELETE) com cookie auth (web), verifica
 *    que o header `x-csrf-token` bate com o cookie `csrf-token`.
 * 3. Para requests com Bearer token (mobile app), CSRF e dispensado —
 *    apps nativos nao sao vulneraveis a CSRF pois nao enviam cookies automaticamente.
 * 4. Rotas de autenticacao (login, register, forgot-password, reset-password)
 *    sao excluidas pois sao acessadas antes de ter CSRF token.
 *
 * O front end web deve:
 * - Ler o cookie `csrf-token` via document.cookie
 * - Enviar o valor como header `x-csrf-token` em todo request de escrita
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  // Rotas que nao exigem CSRF (acessadas antes do token existir)
  // Suporta tanto /v1/... quanto /api/v1/... (Vercel strip ou local)
  private readonly excludedPatterns = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/refresh',
  ];

  private readonly safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  use(req: Request, res: Response, next: NextFunction) {
    const isProduction = process.env.NODE_ENV === 'production';

    // Se o cookie csrf-token nao existe, gerar um novo.
    // NAO regenerar a cada request — isso quebra o double-submit pattern.
    if (!req.cookies?.['csrf-token']) {
      const csrfToken = crypto.randomBytes(32).toString('hex');
      res.cookie('csrf-token', csrfToken, {
        httpOnly: false, // Front precisa ler via document.cookie
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24h
        path: '/',
      });
    }

    // Verificar se a rota exige CSRF
    const url = req.originalUrl || req.url;
    // Normalizar: remover prefixo /api seexistir (Vercel strip)
    const normalizedUrl = url.replace(/^\/api/, '');
    const requiresCsrf =
      !this.safeMethods.includes(req.method) &&
      !this.excludedPatterns.some((pattern) => {
        // Match exato: /auth/login deve bater mas /transactions/auth/login nao
        const regex = new RegExp(`(^|/)${pattern.replace(/^\//, '')}($|[/?])`);
        return regex.test(normalizedUrl);
      });

    if (!requiresCsrf) {
      return next();
    }

    // Mobile usa Bearer token — nao e vulneravel a CSRF
    const hasBearerToken = !!req.headers?.authorization?.startsWith('Bearer ');

    // Web usa cookies — precisa de CSRF
    const hasAuthCookie = !!req.cookies?.['access_token'];

    if (hasBearerToken && !hasAuthCookie) {
      // Mobile/Bearer auth — dispensar CSRF
      return next();
    }

    // Web/Cookie auth — validar double-submit
    const cookieToken = req.cookies?.['csrf-token'];
    const headerToken = req.headers['x-csrf-token'] as string | undefined;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException(
        'CSRF token mismatch. Refresh the page and try again.',
      );
    }
    const cookieBuf = Buffer.from(String(cookieToken));
    const headerBuf = Buffer.from(String(headerToken));
    if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
      throw new ForbiddenException(
        'CSRF token mismatch. Refresh the page and try again.',
      );
    }

    next();
  }
}