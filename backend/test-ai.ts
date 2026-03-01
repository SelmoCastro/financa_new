import { AiService } from './src/ai/ai.service';
import { ConfigService } from '@nestjs/config';

async function run() {
  const config = new ConfigService();
  const ai = new AiService(config);
  
  const categories = [
    'Salário', 'Renda Extra', 'Rendimento de Investimentos', 'Transferência Recebida', 'Empréstimo Recebido', 'Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais', 'Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Viagens', 'Aplicações / Poupança', 'Pagamento de Dívidas'
  ];
  const descriptions = [
    "UBER DO BRASIL TECNOLOGIA",
    "AUTO POSTO COLORADO",
    "PAGAMENTO EMERGENCIAL",
    "MCDONALDS"
  ];
  
  const result = await ai.classifyTransactions(descriptions, categories);
  console.log("Raw AI Classifications:");
  console.log(JSON.stringify(result, null, 2));
}
run();
