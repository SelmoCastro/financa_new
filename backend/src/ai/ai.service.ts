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

        const prompt = `
Aja como um analista financeiro especialista. Vou te passar uma lista de descrições de faturas de cartão de crédito/extrato bancário do Brasil.
Classifique CADA UMA DELAS nas categorias padrão de finanças pessoais seguindo estritamente a Regra 50-30-20:
- 50: Gastos Essenciais (Moradia, Alimentação Básica, Saúde, Transporte, Contas Residenciais)
- 30: Desejos/Estilo de Vida (Restaurantes, iFood, Lazer, Assinaturas, Roupas, Viagens, Uber não-essencial)
- 20: Reserva Financeira / Pagamento de Dívidas (Investimentos, Empréstimos, Poupança)

Para PIX ou Transferências com nomes de pessoas ou "PIX RECEBIDO" classifique como: "Entradas/Transferências" (Regra: 0).
Se for "PIX ENVIADO" sem contexto claro, use "Transferência (Saída)" (Regra: 30).

Devolva APENAS um objeto JSON válido (sem blocos de código markdown \`\`\`json), onde a chave é exatamente a descrição original e o valor é um objeto contendo:
- "category" (string com a categoria sugerida)
- "rule" (número inteiro: 50, 30, 20 ou 0 para entradas)
- "icon" (uma string de UM caractere emoji que represente o gasto. Ex: 🍔, 🚗, 💊, 🏠)

Transações a classificar:
${JSON.stringify(descriptions, null, 2)}
    `;

        try {
            this.logger.log(`Enviando ${descriptions.length} transações para a API Gemini (Camada 2)...`);

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    temperature: 0.1, // Temperatura baixa para respostas consistentes/determinísticas
                    responseMimeType: 'application/json', // Força retorno estruturado
                }
            });

            const responseText = response.text || '{}';
            const parsedData = JSON.parse(responseText);

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
