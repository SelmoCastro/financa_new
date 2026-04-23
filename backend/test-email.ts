import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const resend = new Resend(process.env.RESEND_API_KEY);
const to = 's.elmo@live.com';

async function test() {
  console.log('--- Resend Test ---');
  console.log('API Key:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
  console.log('Sending to:', to);

  const from1 = 'Finanza <noreply@finanzaai.tech>';
  console.log('Test 1 - From:', from1);
  const res1 = await resend.emails.send({
    from: from1,
    to,
    subject: 'Test 1 - Custom Domain',
    html: '<p>Este é um teste com o domínio customizado.</p>'
  });
  console.log('Result 1:', JSON.stringify(res1, null, 2));

  const from2 = 'onboarding@resend.dev';
  console.log('\nTest 2 - From:', from2);
  const res2 = await resend.emails.send({
    from: from2,
    to,
    subject: 'Test 2 - Onboarding Domain',
    html: '<p>Este é um teste com o domínio padrão do Resend.</p>'
  });
  console.log('Result 2:', JSON.stringify(res2, null, 2));
}

test();
