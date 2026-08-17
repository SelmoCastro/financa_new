#!/usr/bin/env node
// MP Proxy — cria preferences do Mercado Pago usando SDK local (IP liberado)
const http = require('http');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const PORT = process.env.PORT || 3099;
const TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is required');
}

const client = new MercadoPagoConfig({
  accessToken: TOKEN,
  options: { timeout: 15000 }
});

const preferenceClient = new Preference(client);

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/checkout/preferences') {
    try {
      const body = await parseBody(req);
      console.log(`[PROXY] ➡️ create_preference: ${body.external_reference}`);

      const result = await preferenceClient.create({
        body: {
          items: body.items,
          external_reference: body.external_reference,
          notification_url: body.notification_url,
          back_urls: body.back_urls,
          auto_return: body.auto_return || 'approved',
        }
      });

      console.log(`[PROXY] ✅ ${result.id} — init_point gerado`);
      res.writeHead(201);
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error(`[PROXY] ❌ ${err.message}`, err.cause?.message || '');
      res.writeHead(502);
      res.end(JSON.stringify({
        error: 'MP proxy failed',
        message: err.message,
        cause: err.cause?.message,
      }));
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'mp-proxy-local' }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 MP Proxy rodando em http://127.0.0.1:${PORT}`);
  console.log(`   POST /checkout/preferences — cria preferência MP`);
  console.log(`   GET  /health — health check`);
});
