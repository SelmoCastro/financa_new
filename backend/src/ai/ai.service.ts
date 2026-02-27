import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { SYSTEM_PROMPTS } from './prompts';

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
                timeout: 8000, // 8 segundos (Vercel Hobby tem limite de 10s)
                defaultHeaders: {
                    'HTTP-Referer': 'https://financa-new.vercel.app',
                    'X-Title': 'Finanza AI',
                },
            });
            this.logger.log(`OpenRouter Service inicializado. Timeout: 8s. Models: ${this.TEXT_MODEL} | ${this.VISION_MODEL}`);
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

        const prompt = `${SYSTEM_PROMPTS.CLASSIFIER}\n\nDados:\n${JSON.stringify(descriptions)}`;

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
            this.logger.error('Erro na API do OpenRouter ao classificar. Usando fallback.', error);
            return this.fallbackClassification(descriptions);
        }
    }

    /**
     * Gera insights financeiros baseados no resumo do mês.
     */
    async getFinancialInsights(summary: any): Promise<string> {
        if (!this.openai) {
            return 'Serviço AI não disponível no momento.';
        }

        const prompt = SYSTEM_PROMPTS.INSIGHTS(JSON.stringify(summary, null, 2));

        try {
            this.logger.log('OpenRouter: Gerando insights financeiros...');

            const response = await this.openai.chat.completions.create({
                model: this.TEXT_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
            });

            return response.choices[0]?.message?.content || 'Não foi possível gerar insights agora. Tente novamente mais tarde.';
        } catch (error) {
            this.logger.error('Erro ao gerar insights via OpenRouter:', error);
            return 'Erro na conexão com a inteligência artificial.';
        }
    }

    /**
     * Limpa descrições de extratos bancários.
     */
    async cleanDescriptions(descriptions: string[]): Promise<Record<string, string>> {
        if (!this.openai || descriptions.length === 0) {
            return {};
        }

        try {
            this.logger.log('OpenRouter: Limpando nomes de transações...');

            const response = await this.openai.chat.completions.create({
                model: this.TEXT_MODEL,
                messages: [{ role: 'user', content: `${SYSTEM_PROMPTS.CLEANER}\n\nDADOS:\n${JSON.stringify(descriptions)}` }],
                response_format: { type: 'json_object' },
            });

            const responseText = response.choices[0]?.message?.content || '{}';
            return JSON.parse(responseText);
        } catch (error) {
            this.logger.error('Erro ao limpar descrições via OpenRouter:', error);
            return {};
        }
    }

    /**
     * Chat financeiro interativo que recebe contexto profundo do perfil.
     */
    async chat(message: string, profile: any): Promise<string> {
        if (!this.openai) {
            return 'Serviço de chat não disponível.';
        }

        const prompt = SYSTEM_PROMPTS.CHAT(JSON.stringify(profile, null, 2));

        try {
            this.logger.log(`OpenRouter: Processando chat - "${message.substring(0, 30)}..."`);

            const response = await this.openai.chat.completions.create({
                model: this.TEXT_MODEL,
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
            });

            return response.choices[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta agora.';
        } catch (error) {
            this.logger.error('Erro no chat via OpenRouter:', error);
            return 'Ocorreu um erro ao conversar com a IA.';
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

        try {
            this.logger.log(`OpenRouter: Processando comprovante com ${this.VISION_MODEL}...`);

            const response = await this.openai.chat.completions.create({
                model: this.VISION_MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPTS.VISION_EXTRACTOR },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: "Extraia os dados desta transação:" },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${imageBase64}`,
                                },
                            },
                        ],
                    },
                ],
                response_format: { type: 'json_object' }
            });

            const responseText = response.choices[0]?.message?.content || '[]';
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
