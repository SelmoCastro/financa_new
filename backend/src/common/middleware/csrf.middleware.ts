import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF Protection via Double-Submit Cookie pattern.
 *
 * Como funciona:
 * 1. Para requests baseados em cookie (web browser), o middleware verifica
 *    que o header `x-csrf-token` bate com o cookie `csrf-token`.
 * 2. Para requests com Bearer token (mobile app), CSRF é dispensado —
 *    apps nativos não são vulneráveis a CSRF pois não enviam cookies automaticamente.
 * 3. Para qualquer request, gera um novo token CSRF e seta como cookie
 *    (não-HttpOnly para que o JS do front possa ler).
 * 4. Rotas de autenticação (login, register, forgot-password, reset-password)
 *    são excluídas pois são acessadas antes de ter CSRF token.
 *
 * O front end web deve:
 * - Ler o cookie `csrf-token` via document.cookie
 * - Enviar o valor como header `x-csrf-token` em todo request de escrita
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  // Rotas que não exigem CSRF (acessadas antes do token existir)
  private readonly excludedPaths = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/refresh',
  ];

  private readonly safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  use(req: Request, res: Response, next: NextFunction) {
    // Sempre gerar e setar um CSRF token no cookie (não-HttpOnly, o front precisa ler)
    const csrfToken = crypto.randomBytes(32).toString('hex');

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('csrf-token', csrfToken, {
      httpOnly: false, // Front precisa ler via document.cookie
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24h
      path: '/',
    });

    // Verificar se a rota exige CSRF
    const requiresCsrf =
      !this.safeMethods.includes(req.method) &&
      !this.excludedPaths.some((path) => req.originalUrl.startsWith(path));

    if (!requiresCsrf) {
      return next();
    }

    // Mobile usa Bearer token — não é vulnerável a CSRF
    // (apps nativos não enviam cookies automaticamente como browsers)
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

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException(
        'CSRF token mismatch. Refresh the page and try again.',
      );
    }

    next();
  }
}