let cachedApp;

export default async function (req, res) {
    if (req.headers['x-test-alive']) {
        return res.status(200).json({ alive: true, message: "Deploy is working" });
    }

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
            const { NestFactory } = await import('@nestjs/core');
            const { AppModule } = await import('../src/app.module.js');
            const { configureApp } = await import('../src/setup.js');

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
