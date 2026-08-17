const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;      }
    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD are required');
  }

  // 1. Login
  const login = await request('POST', '/v1/auth/login', 
    JSON.stringify({ email, password }));
  console.log('Login:', JSON.stringify(login).substring(0, 100));
  
  const token = login?.data?.access_token;
  if (!token) {
    console.log('Failed to get token:', JSON.stringify(login));
    process.exit(1);
  }
  console.log('Token obtained:', token.substring(0, 20) + '...');
  
  // 2. Create preference
  const pref = await request('POST', '/v1/payments/create-preference',
    JSON.stringify({ plan: 'premium_monthly' }), token);
  console.log('\nPreference response:', JSON.stringify(pref).substring(0, 500));
}

main().catch(e => { console.error(e); process.exit(1); });
