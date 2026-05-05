import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

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

  app.enableCors({
    origin: allowedOriginsCORS,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders:
      'Content-Type, Accept, Authorization, X-Requested-With, Cache-Control, Pragma, Expires, X-CSRF-Token',
  });

  // Security Headers (Helmet com CSP restritivo e Policies adicionais)
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
            // Swagger em dev precisa do unpkg/esm.sh, mas nunca unsafe-eval/unsafe-inline em produção
            ...(process.env.NODE_ENV !== 'production' ? ['https://unpkg.com', 'https://esm.sh'] : []),
          ],
          styleSrc: [
            "'self'",
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
