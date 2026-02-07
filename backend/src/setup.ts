import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export function configureApp(app: INestApplication) {
    // CORS
    app.enableCors({
        origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:3000'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Accept, Authorization',
    });

    // Security Headers
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "https://unpkg.com", "https://esm.sh", "'unsafe-inline'"],
                styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https://esm.sh"],
                connectSrc: ["'self'"],
            },
        },
    }));

    // API Versioning
    app.enableVersioning({
        type: VersioningType.URI,
    });

    // Global Pipes & Interceptors
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    // Swagger Config
    const config = new DocumentBuilder()
        .setTitle('Finanza API')
        .setDescription('API do Dashboard Financeiro Simplificado. Use esta documentação para testar os endpoints.')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
}
