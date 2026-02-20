import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export function configureApp(app: INestApplication) {
    // CORS
    app.enableCors({
        origin: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
        allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
    });

    // Security Headers
    app.use(helmet({
        crossOriginResourcePolicy: false,
        crossOriginOpenerPolicy: false,
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
