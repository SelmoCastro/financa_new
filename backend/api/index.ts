import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

let cachedApp;

export default async function (req, res) {
    // CORS manual hardcoded fallback para Serveless
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (!cachedApp) {
            const app = await NestFactory.create(AppModule);

            configureApp(app);

            await app.init();
            cachedApp = app;
        }

        const instance = cachedApp.getHttpAdapter().getInstance();
        return instance(req, res);
    } catch (err: any) {
        console.error('VERCEL CRASH ERROR:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 'Serverless Bootstrap Failed',
            message: err?.message,
            stack: err?.stack
        }));
    }
}
