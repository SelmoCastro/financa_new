/**
 * Centraliza a configuração global do backend: segurança, CORS, CSP, CSRF, versionamento, pipes, interceptors e Swagger.
 */
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
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
  // Define a lista de origens confiáveis para navegador sem abrir CORS para a internet inteira.
  const frontendUrl = process.env.FRONTEND_URL || 'https://finanzaai.tech';
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOriginsCORS = [
    frontendUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    // Em produção, só aceita deploys conhecidos para evitar abuso com subdomínios curingas.
    ...(isProduction
      ? [
          /^https:\/\/financa-new-[a-z0-9-]+\.vercel\.app$/,
          // Aceita apenas domínio principal e www; nada de subdomínio arbitrário.
          'https://finanzaai.tech',
          'https://www.finanzaai.tech',
        ]
      : [
          /^https?:\/\/([a-z0-9-]+\.)?vercel\.app(?::\d+)?$/,
          /^https?:\/\/([a-z0-9-]+\.)?finanzaai\.tech(?::\d+)?$/,
        ]),
    /^exp:\/\//,
    // Rede local só no desenvolvimento para testes em outros dispositivos.
    ...(!isProduction ? [/^http:\/\/192\.168\.\d+\.\d+:\d+$/] : []),
  ];

  // A CSP usa uma lista separada porque aqui precisamos declarar destinos para scripts, fontes e conexões.
  const allowedOriginsCSP = [
    frontendUrl,
    ...(!isProduction
      ? [
          'http://localhost:5173',
          'http://localhost:3000',
          'http://192.168.*',
          'exp://*',
        ]
      : []),
    'https://*.vercel.app',
    'https://api.finanzaai.tech',
  ];

  // Validador explícito de origem. Se a origem não for aprovada, o browser bloqueia a chamada ainda no preflight.
  const corsOriginValidator = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) {
      // Navegadores não enviam Origin em requisições same-origin. Isso inclui
      // o frontend de produção, que chama a API pelo caminho relativo /api/v1.
      // O isolamento same-origin protege as leituras e o middleware CSRF
      // continua protegendo as requisições mutáveis autenticadas por cookie.
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

  // Gera um nonce único por request para permitir apenas scripts inline explicitamente autorizados pela CSP.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const nonce = generateNonce();
    res.locals.nonce = nonce;
    next();
  });

  // Aplica headers de segurança globais com Helmet e CSP baseada em nonce.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      frameguard: false, // nginx already sends X-Frame-Options
      hsts: false, // nginx already sends Strict-Transport-Security
      xssFilter: false, // nginx already sends X-XSS-Protection
      noSniff: false, // nginx already sends X-Content-Type-Options
      referrerPolicy: false, // nginx already sends Referrer-Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            // O Helmet chama essa função a cada request e injeta o nonce gerado acima.
            (req: Request, res: Response) => `'nonce-${res.locals.nonce}'`,
            // Scripts de analytics só passam a operar corretamente depois do consentimento LGPD no frontend.
            'https://www.googletagmanager.com',
            'https://www.google-analytics.com',
            // Swagger em dev depende desses hosts externos; em produção eles ficam fora da política.
            ...(process.env.NODE_ENV !== 'production'
              ? ['https://unpkg.com', 'https://esm.sh']
              : []),
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Tailwind ainda injeta estilos inline em alguns pontos do app.
            'https://fonts.googleapis.com',
          ],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            ...allowedOriginsCSP,
            'https://www.google-analytics.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          scriptSrcAttr: ["'none'"],
          upgradeInsecureRequests: [],
        },
        // Report CSP violations so we can detect XSS attempts
        // Uses report-uri (deprecated but universally supported) with optional env var
        ...(process.env.CSP_REPORT_URI
          ? { reportUri: process.env.CSP_REPORT_URI }
          : {}),
      },
    }),
  );

  // Complementa o Helmet com headers que deixam a política mais explícita.
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Desliga APIs de navegador que o produto não precisa usar.
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=(), vibrate=(), fullscreen=(self)',
    );
    // Mantido explicitamente para não depender só do comportamento padrão do Helmet.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Lê cookies antes dos guards e middlewares de auth/CSRF.
  app.use(cookieParser());

  // Logger HTTP simples para diagnóstico local sem poluir produção.
  if (process.env.NODE_ENV !== 'production') {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const start = Date.now();
      const method = req.method;
      const url = req.originalUrl || req.url;
      const hasAuth = !!(
        req.cookies?.access_token || req.headers?.authorization
      );
      _res.on('finish', () => {
        const duration = Date.now() - start;
        const status = _res.statusCode;
        console.log(
          `[HTTP] ${method} ${url} ${status} ${duration}ms auth:${hasAuth}`,
        );
      });
      next();
    });
  }

  // Proteção CSRF por double-submit cookie: escrita só passa quando header e cookie batem.
  const csrfMiddleware = new CsrfMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) =>
    csrfMiddleware.use(req, res, next),
  );

  // Mantém compatibilidade entre versões da API sem quebrar clientes antigos.
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Regras globais de validação, serialização e tratamento de erro.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger só em ambientes de desenvolvimento/staging para não expor superfície extra em produção.
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
