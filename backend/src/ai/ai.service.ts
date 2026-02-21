import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

interface ClassificationResult {
    category: string;
    rule: number;
    icon: string;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private ai: GoogleGenAI | null = null;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.ai = new GoogleGenAI({ apiKey });
            this.logger.log('Gemini AI Service inicializado com sucesso.');
        } else {
            this.logger.warn('GEMINI_API_KEY não configurada. Serviço AI rodará em modo Fallback (Desativado).');
        }
    }

    /**
     * Recebe um array de descrições de transações e retorna a classificação delas
     * de acordo com a regra 50-30-20.
     */
    async classifyTransactions(descriptions: string[]): Promise<Record<string, ClassificationResult>> {
        if (!this.ai || descriptions.length === 0) {
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
            this.logger.log(`Enviando ${descriptions.length} txs p/ Gemini (Prompt Otimizado)`);

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    temperature: 0.0, // Zero criatividade, máxima exatidão estrutural
                    responseMimeType: 'application/json',
                }
            });

            const responseText = response.text || '{}';
            const rawData = JSON.parse(responseText);

            // Mapeia do formato minificado {c, r, i} de volta para a Interface do backend
            const parsedData: Record<string, ClassificationResult> = {};
            for (const [key, value] of Object.entries<any>(rawData)) {
                parsedData[key] = {
                    category: value.c || 'Outros',
                    rule: typeof value.r === 'number' ? value.r : 30,
                    icon: value.i || '🏷️'
                };
            }

            this.logger.log(`Gemini classificou as transações com sucesso.`);
            return parsedData;

        } catch (error) {
            this.logger.error('Erro na API da Gemini. Usando fallback.', error);
            return this.fallbackClassification(descriptions);
        }
    }

    /**
     * Caso a API do Google caia ou a chave não exista, usamos o fallback
     * que devolverá tudo categorizado como 'Outros' (Camada 0).
     */
    private fallbackClassification(descriptions: string[]): Record<string, ClassificationResult> {
        const result: Record<string, ClassificationResult> = {};
        for (const desc of descriptions) {
            result[desc] = {
                category: 'Outros',
                rule: 30, // Fallback joga na conta de desejos
                icon: '🏷️'
            };
        }
        return result;
    }
}
