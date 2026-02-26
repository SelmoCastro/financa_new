import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

interface ClassificationResult {
    category: string;
    rule: number;
    icon: string;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private openai: OpenAI | null = null;

    // Modelos configuráveis via .env com fallbacks gratuitos
    private readonly VISION_MODEL = process.env.AI_VISION_MODEL || 'google/gemini-2.0-flash-exp:free';
    private readonly TEXT_MODEL = process.env.AI_TEXT_MODEL || 'google/gemini-2.0-flash-exp:free';

    constructor() {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({
                apiKey: apiKey,
                baseURL: 'https://openrouter.ai/api/v1',
                defaultHeaders: {
                    'HTTP-Referer': 'https://financa-new.vercel.app', // Opcional, para o ranking do OpenRouter
                    'X-Title': 'Finanza AI',
                },
            });
            this.logger.log(`OpenRouter Service inicializado. Text model: ${this.TEXT_MODEL}, Vision model: ${this.VISION_MODEL}`);
        } else {
            this.logger.warn('OPENROUTER_API_KEY não configurada. Serviço AI rodará em modo Fallback (Desativado).');
        }
    }

    /**
     * Recebe um array de descrições de transações e retorna a classificação delas
     * usando a Regra 50-30-20 via OpenRouter.
     */
    async classifyTransactions(descriptions: string[]): Promise<Record<string, ClassificationResult>> {
        if (!this.openai || descriptions.length === 0) {
            return this.fallbackClassification(descriptions);
        }

        const prompt = `Classifique extratos bancários brasileiros usando a Regra 50-30-20.
Retorne um JSON ONDE A CHAVE É A DESCRIÇÃO ORIGINAL EXATA e o valor é {c: "Categoria Exata", r: Regra(0,20,30,50), i: "1Emoji"}.

USE APENAS ESTAS CATEGORIAS EXATAS (Nenhuma a mais):
50 (Necessidades): "Moradia", "Contas Residenciais", "Mercado / Padaria", "Transporte Fixo", "Saúde e Farmácia", "Educação", "Impostos Anuais e Seguros", "Impostos Mensais"
30 (Desejos): "Restaurante / Delivery", "Transporte App", "Lazer / Assinaturas", "Compras / Vestuário", "Cuidados Pessoais", "Viagens"
20 (Objetivos): "Aplicações / Poupança", "Pagamento de Dívidas"
0 (Entradas): "Salário", "Renda Extra", "Rendimento de Investimentos", "Transferência Recebida", "Empréstimo Recebido"

Se for devolução/estorno, use 0. Pix enviado: 30.

Dados:
${JSON.stringify(descriptions)}`;

        try {
            this.logger.log(`OpenRouter: Classificando ${descriptions.length} transações...`);

            const response = await this.openai.chat.completions.create({
                model: this.TEXT_MODEL,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
            });

            const responseText = response.choices[0]?.message?.content || '{}';
            const rawData = JSON.parse(responseText);

            const parsedData: Record<string, ClassificationResult> = {};
            for (const [key, value] of Object.entries<any>(rawData)) {
                parsedData[key] = {
                    category: value.c || 'Outros',
                    rule: typeof value.r === 'number' ? value.r : 30,
                    icon: value.i || '🏷️'
                };
            }

            return parsedData;
        } catch (error) {
            this.logger.error('Erro na API do OpenRouter. Usando fallback.', error);
            return this.fallbackClassification(descriptions);
        }
    }

    /**
     * Extrai dados de transação de uma imagem de comprovante usando OpenRouter (Vision).
     */
    async extractFromReceipt(imageBase64: string, mimeType: string): Promise<ReceiptTransaction[]> {
        if (!this.openai) {
            this.logger.warn('AiService: OpenRouter não disponível.');
            return [];
        }

        const prompt = `Analise esta imagem de comprovante bancário brasileiro.
Extraia as transações e retorne um JSON array com o seguinte formato:
[
  {
    "date": "YYYY-MM-DD",
    "amount": 150.00,
    "description": "PIX para João Silva",
    "type": "EXPENSE",
    "suggestedCategory": "Transferência Recebida",
    "suggestedRule": 30,
    "suggestedIcon": "💸"
  }
]

Regras:
- "type": "EXPENSE" para saídas, "INCOME" para entradas
- "amount": sempre positivo
- "date": formato YYYY-MM-DD. Ano atual: ${new Date().getFullYear()}
- Se não houver dados, retorne []
- Retorne APENAS o JSON array.`;

        try {
            this.logger.log(`OpenRouter: Processando comprovante com ${this.VISION_MODEL}...`);

            const response = await this.openai.chat.completions.create({
                model: this.VISION_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${imageBase64}`,
                                },
                            },
                        ],
                    },
                ],
                // OpenRouter/OpenAI response_format para vision pode variar, mas gemini via OR aceita json
                response_format: { type: 'json_object' }
            });

            const responseText = response.choices[0]?.message?.content || '[]';
            // Alguns modelos retornam { "transactions": [...] } ou direto o array
            const rawData = JSON.parse(responseText);
            const parsed = Array.isArray(rawData) ? rawData : (rawData.transactions || []);

            return parsed;
        } catch (error) {
            this.logger.error('Erro ao extrair via OpenRouter Vision:', error);
            return [];
        }
    }

    private fallbackClassification(descriptions: string[]): Record<string, ClassificationResult> {
        const result: Record<string, ClassificationResult> = {};
        for (const desc of descriptions) {
            result[desc] = { category: 'Outros', rule: 30, icon: '🏷️' };
        }
        return result;
    }
}

export interface ReceiptTransaction {
    date: string;
    amount: number;
    description: string;
    type: 'INCOME' | 'EXPENSE';
    suggestedCategory?: string;
    suggestedRule?: number;
    suggestedIcon?: string;
}
