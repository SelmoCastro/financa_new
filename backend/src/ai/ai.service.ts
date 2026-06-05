import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { SYSTEM_PROMPTS } from './prompts';

interface ClassificationResult {
  category: string;
  c?: string; // AI short form
  rule: number;
  r?: number; // AI short form
  icon: string;
  i?: string; // AI short form
  cleanName?: string;
  n?: string; // AI short form for cleanName
  confidence?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;

  // Modelos configuráveis via .env com fallbacks
  private readonly VISION_MODEL =
    process.env.AI_VISION_MODEL || 'openai/gpt-4o-mini';
  private readonly TEXT_MODEL =
    process.env.AI_TEXT_MODEL || 'openai/gpt-4o-mini';

  constructor() {
    // Prioridade: AI_API_KEY > OPENROUTER_API_KEY
    const apiKey = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY;
    const baseURL = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';

    if (apiKey) {
      const isZen = baseURL.includes('opencode.ai');
      const headers: Record<string, string> = {};
      if (!isZen) {
        headers['HTTP-Referer'] = 'https://finanzaai.tech';
        headers['X-Title'] = 'Finanza AI';
      }

      this.openai = new OpenAI({
        apiKey,
        baseURL,
        timeout: 60000,
        defaultHeaders: headers,
      });
      this.logger.log(
        `${isZen ? 'ZEN' : 'OpenRouter'} Service inicializado. Timeout: 60s. Models: ${this.TEXT_MODEL} | ${this.VISION_MODEL}`,
      );
    } else {
      this.logger.warn(
        'AI_API_KEY / OPENROUTER_API_KEY não configurada. Serviço AI rodará em modo Fallback (Desativado).',
      );
    }
  }

  /**
   * Recebe um array de descrições de transações e retorna a classificação delas
   * usando a Regra 50-30-20 via OpenRouter.
   */
  async classifyTransactions(
    descriptions: string[],
    categories: string[] = [],
  ): Promise<Record<string, ClassificationResult>> {
    if (!this.openai || descriptions.length === 0) {
      return this.fallbackClassification(descriptions);
    }

    const prompt = `${SYSTEM_PROMPTS.CLASSIFIER(categories)}\n\nDados:\n${JSON.stringify(descriptions)}`;

    try {
      this.logger.log(
        `OpenRouter: Classificando ${descriptions.length} transações...`,
      );

      const response = await this.openai.chat.completions.create({
        model: this.TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const responseText = response.choices[0]?.message?.content || '{}';

      // Tenta limpar possíveis marcações de markdown do JSON
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      const rawData = JSON.parse(cleanJson);

      // Algumas IAs podem envolver o resultado em uma chave "transactions" ou similar
      const dataToProcess =
        rawData.transactions || rawData.classifications || rawData;

      const parsedData: Record<string, ClassificationResult> = {};
      for (const [key, value] of Object.entries(
        dataToProcess as Record<string, ClassificationResult>,
      )) {
        parsedData[key] = {
          category: value.c || value.category || 'Outros',
          rule:
            typeof (value.r || value.rule) === 'number'
              ? value.r || value.rule
              : 30,
          icon: value.i || value.icon || '🏷️',
          cleanName: value.n || value.cleanName || undefined,
        };
      }

      return parsedData;
    } catch (error) {
      this.logger.error(
        'Erro na API do OpenRouter ao classificar. Usando fallback.',
        error,
      );
      return this.fallbackClassification(descriptions);
    }
  }

  /**
   * Gera insights financeiros baseados no resumo do mês.
   */
  async getFinancialInsights(
    summary: Record<string, unknown> | unknown[],
  ): Promise<string> {
    if (!this.openai) {
      return 'Serviço AI não disponível no momento.';
    }

    const compactSummary = this.buildInsightsSummary(summary);
    const prompt = SYSTEM_PROMPTS.INSIGHTS(compactSummary);

    try {
      this.logger.log(
        `AI: Gerando insights financeiros (${compactSummary.length} chars de contexto)...`,
      );

      const response = await this.openai.chat.completions.create({
        model: this.TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        reasoning_effort: 'low',
      } as any);

      return (
        response.choices[0]?.message?.content ||
        'Não foi possível gerar insights agora. Tente novamente mais tarde.'
      );
    } catch (error) {
      this.logger.error('Erro ao gerar insights via IA:', error);
      return 'Erro na conexão com a inteligência artificial.';
    }
  }

  /**
   * Keep dashboard insights fast and reliable on free reasoning models.
   * The full financial profile can be large and may include raw encrypted values
   * from direct Prisma reads. Insights only need dashboard aggregates + top risks.
   */
  private buildInsightsSummary(
    summary: Record<string, unknown> | unknown[],
  ): string {
    const profile = Array.isArray(summary)
      ? { data: summary }
      : (summary as Record<string, any>);
    const userSummary = profile?.userSummary || profile || {};
    const currentMonth = userSummary?.currentMonth || {};
    const rule503020 =
      userSummary?.rule503020 || userSummary?.rule50_30_20 || {};
    const categorySummary = Array.isArray(userSummary?.categorySummary)
      ? userSummary.categorySummary.slice(0, 6)
      : [];
    const topMonthlyExpenses = Array.isArray(profile?.topMonthlyExpenses)
      ? profile.topMonthlyExpenses.slice(0, 5)
      : [];
    const monthlyHistory = Array.isArray(userSummary?.monthlyHistory)
      ? userSummary.monthlyHistory.slice(-4)
      : [];

    const activeGoalsCount = Array.isArray(profile?.activeGoals)
      ? profile.activeGoals.length
      : 0;
    const activeBudgetsCount = Array.isArray(profile?.activeBudgets)
      ? profile.activeBudgets.length
      : 0;

    return JSON.stringify(
      {
        currentMonth: {
          income: currentMonth.income ?? userSummary.currentIncome ?? 0,
          expenses: currentMonth.expenses ?? userSummary.currentExpense ?? 0,
          balance: userSummary.balance ?? 0,
          available:
            userSummary.available ?? userSummary.availableReal ?? undefined,
          creditCardDebt: userSummary.creditCardDebt ?? 0,
        },
        trends: {
          incomeTrend: userSummary.incomeTrend ?? 0,
          expenseTrend: userSummary.expenseTrend ?? 0,
        },
        rule503020,
        topMonthlyExpenses,
        categorySummary,
        monthlyHistory,
        activeGoalsCount,
        activeBudgetsCount,
      },
      null,
      2,
    );
  }

  /**
   * @deprecated Use classifyTransactions() — it now returns cleanName in the result.
   * This method is kept for backward compatibility but should not be called
   * to avoid double API charges on OpenRouter.
   */
  async cleanDescriptions(
    descriptions: string[],
  ): Promise<Record<string, string>> {
    if (!this.openai || descriptions.length === 0) {
      return {};
    }

    try {
      this.logger.log('OpenRouter: Limpando nomes de transações...');

      const response = await this.openai.chat.completions.create({
        model: this.TEXT_MODEL,
        messages: [
          {
            role: 'user',
            content: `${SYSTEM_PROMPTS.CLEANER}\n\nDADOS:\n${JSON.stringify(descriptions)}`,
          },
        ],
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
  async chat(
    message: string,
    profile: Record<string, unknown> | unknown[],
  ): Promise<string> {
    if (!this.openai) {
      return 'Serviço de chat não disponível.';
    }

    const prompt = SYSTEM_PROMPTS.CHAT(JSON.stringify(profile, null, 2));

    try {
      this.logger.log(
        `OpenRouter: Processando chat - "${message.substring(0, 30)}..."`,
      );

      const response = await this.openai.chat.completions.create({
        model: this.TEXT_MODEL,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
      });

      return (
        response.choices[0]?.message?.content ||
        'Desculpe, não consegui processar sua pergunta agora.'
      );
    } catch (error) {
      this.logger.error('Erro no chat via OpenRouter:', error);
      return 'Ocorreu um erro ao conversar com a IA.';
    }
  }

  /**
   * Análise Preditiva - Com base no histórico de gastos recentes,
   * prevê como o mês atual vai terminar e destaca riscos.
   */
  async getSpendingForecast(
    historicalData: Record<string, unknown> | unknown[],
  ): Promise<string> {
    if (!this.openai) {
      return 'Serviço de previsão AI não disponível no momento.';
    }

    const prompt = SYSTEM_PROMPTS.FORECASTING(
      JSON.stringify(historicalData, null, 2),
    );

    try {
      this.logger.log(
        'OpenRouter: Gerando previsão de gastos (forecasting)...',
      );

      const response = await this.openai.chat.completions.create({
        model: this.TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      });

      return (
        response.choices[0]?.message?.content ||
        'Não foi possível gerar a previsão no momento.'
      );
    } catch (error) {
      this.logger.error('Erro ao gerar previsão via OpenRouter:', error);
      return 'Erro na conexão com a inteligência artificial.';
    }
  }

  /**
   * Análise Preditiva - Identifica possíveis assinaturas pagas
   * ou serviços esquecidos recorrentes nos últimos meses.
   */
  async findRecurringSubscriptions(
    recentTransactions: Record<string, unknown> | unknown[],
  ): Promise<string> {
    if (!this.openai) {
      return 'Scanner de assinaturas não disponível no momento.';
    }

    const prompt = SYSTEM_PROMPTS.FIND_SUBSCRIPTIONS(
      JSON.stringify(recentTransactions, null, 2),
    );

    try {
      this.logger.log(
        'OpenRouter: Procurando por contas recorrentes/assinaturas...',
      );

      const response = await this.openai.chat.completions.create({
        model: this.TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      return (
        response.choices[0]?.message?.content ||
        'Não foi possível encontrar assinaturas no momento.'
      );
    } catch (error) {
      this.logger.error('Erro ao procurar assinaturas via OpenRouter:', error);
      return 'Erro na conexão com a inteligência artificial.';
    }
  }

  /**
   * Extrai dados de transação de uma imagem ou PDF de comprovante usando OpenRouter (Vision).
   * Retorna objeto com transactions e error para feedback detalhado.
   */
  async extractFromReceipt(
    fileBase64: string,
    mimeType: string,
    categories: string[] = [],
  ): Promise<ReceiptExtractionResult> {
    if (!this.openai) {
      this.logger.warn('AiService: OpenRouter não disponível.');
      return { transactions: [], error: 'service_unavailable' };
    }

    try {
      this.logger.log(
        `OpenRouter: Processando comprovante (${mimeType}) com ${this.VISION_MODEL}...`,
      );

      const isPdf = mimeType === 'application/pdf';
      const contentParts: Array<Record<string, unknown>> = [
        {
          type: 'text',
          text: 'Extraia os dados de todas as transações encontradas neste documento:',
        },
      ];

      if (isPdf) {
        contentParts.push({
          type: 'file',
          file_url: {
            url: `data:${mimeType};base64,${fileBase64}`,
          },
        });
      } else {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${fileBase64}`,
          },
        });
      }

      const response = await this.openai.chat.completions.create({
        model: this.VISION_MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.VISION_EXTRACTOR(categories),
          },
          {
            role: 'user',
            content:
              contentParts as unknown as OpenAI.ChatCompletionContentPart[],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
      });

      const responseText = response.choices[0]?.message?.content || '{}';
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      const rawData = JSON.parse(cleanJson);

      const parsed = Array.isArray(rawData)
        ? rawData
        : rawData.transactions ||
          rawData.data ||
          rawData.items ||
          rawData.results ||
          [];

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { transactions: [], error: 'no_data_found' };
      }

      return { transactions: parsed, error: null };
    } catch (error: unknown) {
      const err = error as Error & { status?: number };
      this.logger.error(
        'Erro ao extrair via OpenRouter Vision:',
        err?.message || String(error),
      );

      if (err?.status === 400 || err?.status === 422) {
        return { transactions: [], error: 'unsupported_format' };
      }
      if (err?.status === 429) {
        return { transactions: [], error: 'rate_limit' };
      }
      if (err?.status === 500 || err?.status === 503) {
        return { transactions: [], error: 'api_error' };
      }

      return { transactions: [], error: 'unknown_error' };
    }
  }

  /**
   * Extrai dados de transação de texto OCR (comprovante lido localmente).
   * Envia apenas o texto extraído para o modelo de IA (sem imagem).
   */
  async extractFromOcrText(
    ocrText: string,
    categories: string[] = [],
  ): Promise<ReceiptExtractionResult> {
    if (!this.openai) {
      return { transactions: [], error: 'service_unavailable' };
    }

    try {
      this.logger.log(
        `OpenRouter: Processando texto OCR (${ocrText.length} chars) com ${this.TEXT_MODEL}...`,
      );

      const prompt = `${SYSTEM_PROMPTS.OCR_EXTRACTOR(categories)}\n\nTEXTO EXTRAÍDO DO COMPROVANTE:\n${ocrText}`;

      const response = await this.openai.chat.completions.create({
        model: this.TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
      });

      const responseText = response.choices[0]?.message?.content || '{}';
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      const rawData = JSON.parse(cleanJson);

      const parsed = Array.isArray(rawData)
        ? rawData
        : rawData.transactions ||
          rawData.data ||
          rawData.items ||
          rawData.results ||
          [];

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { transactions: [], error: 'no_data_found' };
      }

      return { transactions: parsed, error: null };
    } catch (error: unknown) {
      const err = error as Error & { status?: number };
      this.logger.error(
        'Erro ao extrair via OCR + IA:',
        err?.message || String(error),
      );
      return { transactions: [], error: 'unknown_error' };
    }
  }

  private fallbackClassification(
    descriptions: string[],
  ): Record<string, ClassificationResult> {
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
  confidence?: number;
  cnpj?: string;
}

export type ReceiptErrorType =
  | 'service_unavailable'
  | 'no_data_found'
  | 'unsupported_format'
  | 'rate_limit'
  | 'api_error'
  | 'unknown_error'
  | null;

export interface ReceiptExtractionResult {
  transactions: ReceiptTransaction[];
  error: ReceiptErrorType;
}
