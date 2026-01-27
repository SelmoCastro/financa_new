
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

let cachedApp;

export default async function (req, res) {
    if (!cachedApp) {
        const app = await NestFactory.create(AppModule);

        app.enableCors({
            origin: '*',
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
            allowedHeaders: 'Content-Type, Accept, Authorization',
        });

        app.use(helmet());
        app.enableVersioning({ type: VersioningType.URI });
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        app.useGlobalInterceptors(new TransformInterceptor());
        app.useGlobalFilters(new HttpExceptionFilter());

        await app.init();
        cachedApp = app;
    }

    const instance = cachedApp.getHttpAdapter().getInstance();
    return instance(req, res);
}
