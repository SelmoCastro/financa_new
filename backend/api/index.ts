import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

let cachedApp;

export default async function (req, res) {
    if (!cachedApp) {
        const app = await NestFactory.create(AppModule);

        configureApp(app);

        await app.init();
        cachedApp = app;
    }

    const instance = cachedApp.getHttpAdapter().getInstance();
    return instance(req, res);
}
