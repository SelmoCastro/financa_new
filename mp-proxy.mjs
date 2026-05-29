import express from 'express';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const PORT = process.env.PORT || 3099;
const TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-4342173784896366-051118-e7f1e420c1fef34d1af5da6789d511e4-280905409';

const client = new MercadoPagoConfig({
  accessToken: TOKEN,
  options: { timeout: 10000 }
});

const preferenceClient = new Preference(client);

const app = express();
app.use(express.json());

// Proxy para criar preferências
app.post('/checkout/preferences', async (req, res) => {
  const body = req.body;
  console.log(`[PROXY] create_preference: external_reference=${body.external_reference}`);

  try {
    const result = await preferenceClient.create({
      body: {
        items: body.items,
        external_reference: body.external_reference,
        notification_url: body.notification_url,
        back_urls: body.back_urls,
        auto_return: body.auto_return || 'approved',
      }
    });

    console.log(`[PROXY] ✅ Preference ${result.id} criada`);
    res.json(result);
  } catch (err) {
    console.error(`[PROXY] ❌ Erro:`, err.message, err.cause?.message || '');
    res.status(500).json({
      status: 500,
      message: `MP Proxy error: ${err.message}`,
      cause: err.cause?.message,
    });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', via: 'mp-proxy-local' }));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[MP-PROXY] Rodando em http://127.0.0.1:${PORT}`);
  console.log(`[MP-PROXY] POST /checkout/preferences`);
});
