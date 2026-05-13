import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as crypto from 'crypto';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

/**
 * Generate a cryptographically random nonce for CSP.
 * Each request gets a unique nonce that is embedded in CSP headers
 * and made available to templates via res.locals.
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

export function configureApp(app: INestApplication) {
  // CORS (Aceita Regex)
  const frontendUrl =
    process.env.FRONTEND_URL || 'https://finanzaai.tech';
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOriginsCORS = [
    frontendUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    // Only allow specific Vercel deploys in production (prevent wildcard subdomain abuse)
    ...(isProduction
      ? [/^https:\/\/financa-new-[a-z0-9-]+\.vercel\.app$/, /finanzaai\.tech$/]
      : [/\.vercel\.app$/, /\.finanzaai\.tech$/]),
    /^exp:\/\//,
    // Local network only in development
    ...(!isProduction ? [/^http:\/\/192\.168\.\d+\.\d+:\d+$/] : []),
  ];

  // CSP (Aceita Wildcard mas não Regex)
  // Em produção, remover URLs de dev para não vazar infraestrutura
  const allowedOriginsCSP = [
    frontendUrl,
    ...(!isProduction
      ? ['http://localhost:5173', 'http://localhost:3000', 'http://192.168.*', 'exp://*']
      : []),
    'https://*.vercel.app',
    'https://*.finanzaai.tech',
  ];

  // Custom origin validator: only echo CORS headers for whitelisted origins.
  // When callback(null, false), NestJS omits Access-Control-Allow-Origin from the
  // preflight response, causing browsers to block the actual request entirely.
  const corsOriginValidator = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      // Non-browser requests (curl, server-to-server) — allow
      return callback(null, true);
    }
    const isAllowed = allowedOriginsCORS.some((o) => {
      if (typeof o === 'string') return o === origin;
      if (o instanceof RegExp) return o.test(origin);
      return false;
    });
    callback(null, isAllowed);
  };

  app.enableCors({
    origin: corsOriginValidator,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders:
      'Content-Type, Accept, Authorization, X-Requested-With, Cache-Control, Pragma, Expires, X-CSRF-Token',
  });

  // ── Security: CSP Nonce-per-request ──
  // Generate a unique nonce for each request and attach it to res.locals.
  // The CSP header in Helmet references this nonce, so inline scripts/tags
  // must use <script nonce="..."> to be allowed.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const nonce = generateNonce();
    res.locals.nonce = nonce;
    next();
  });

  // ── Security Headers (Helmet com CSP nonce-based) ──
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      frameguard: { action: 'deny' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            // Dynamic nonce — Helmet replaces this function with the actual nonce per request
            (req: Request, res: Response) => `'nonce-${res.locals.nonce}'`,
            // Swagger in dev needs unpkg/esm.sh, never in production
            ...(process.env.NODE_ENV !== 'production' ? ['https://unpkg.com', 'https://esm.sh'] : []),
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Tailwind needs inline styles
            ...(process.env.NODE_ENV !== 'production' ? ['https://fonts.googleapis.com'] : []),
          ],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...allowedOriginsCSP],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          scriptSrcAttr: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
    }),
  );

  // Additional security headers not covered by Helmet
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Disable browser features we don't use (camera, mic, geolocation, etc.)
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=(), vibrate=(), fullscreen=(self)');
    // Prevent MIME-type sniffing (redundant with helmet noSniff but explicit)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Cookie Parser (necessário para CSRF e auth cookies)
  app.use(cookieParser());

  // V16: Debug request logger — only in non-production
  if (process.env.NODE_ENV !== 'production') {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const start = Date.now();
      const method = req.method;
      const url = req.originalUrl || req.url;
      const hasAuth = !!(req.cookies?.access_token || req.headers?.authorization);
      _res.on('finish', () => {
        const duration = Date.now() - start;
        const status = _res.statusCode;
        console.log(`[HTTP] ${method} ${url} ${status} ${duration}ms auth:${hasAuth}`);
      });
      next();
    });
  }

  // CSRF Protection (double-submit cookie pattern)
  // Para requests de escrita (POST/PUT/PATCH/DELETE), exige header x-csrf-token = cookie csrf-token
  // Rotas de auth (login, register, etc.) são excluídas
  const csrfMiddleware = new CsrfMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => csrfMiddleware.use(req, res, next));

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global Pipes & Interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger Config (apenas em dev/staging, NUNCA em producao)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Finanza API')
      .setDescription(
        'API do Dashboard Financeiro Simplificado. Use esta documentação para testar os endpoints.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }
}
