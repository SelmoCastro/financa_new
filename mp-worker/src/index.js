/**
 * Cloudflare Worker — Proxy para Mercado Pago API
 *
 * Recebe requisições do backend (VPS Hostinger), adiciona o token de acesso
 * e encaminha para api.mercadopago.com. Resolve bloqueio PolicyAgent 403.
 *
 * Uso:
 *   POST /checkout/preferences  → api.mercadopago.com/checkout/preferences
 *   POST /v1/payments            → api.mercadopago.com/v1/payments
 *   GET  /v1/payments/:id        → api.mercadopago.com/v1/payments/:id
 *   Qualquer método/path é forwarding puro
 *
 * Variáveis de ambiente (secrets):
 *   MP_ACCESS_TOKEN  — Access Token de produção do Mercado Pago (obrigatório)
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = `https://api.mercadopago.com${url.pathname}${url.search}`;

    // Headers ESPELHANDO o SDK mercadopago Node.js v3
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${env.MP_ACCESS_TOKEN}`);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    headers.set('User-Agent', 'MercadoPago Node.js SDK v3.0.0');
    headers.set('X-Product-Id', 'B309UHNBH3PP1');
    headers.set('X-Corporation-Id', 'MP');
    headers.set('X-Integrator-Id', '');

    // Encaminha requisição
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? request.body
        : null,
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  },
};
