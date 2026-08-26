/**
 * Service do domínio de inteligência artificial; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  ChatCompletion,
  ChatCompletionContentPart,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionUserMessageParam,
} from 'openai/resources/chat/completions';
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

interface UnknownObject {
  [key: string]: unknown;
}

type HeaderMap = { [key: string]: string };

interface InsightsMonthSummary {
  income?: number;
  expense?: number;
  incomeTrend?: number;
  expenseTrend?: number;
}

interface RuleSummaryValue {
  value: number;
  percent: number;
}

interface Rule503020Summary {
  needs?: RuleSummaryValue;
  wants?: RuleSummaryValue;
  savings?: RuleSummaryValue;
  uncategorized?: RuleSummaryValue;
}

interface InsightsUserSummary {
  currentMonth?: InsightsMonthSummary;
  currentIncome?: number;
  currentExpense?: number;
  balance?: number;
  available?: number;
  availableReal?: number;
  creditCardDebt?: number;
  incomeTrend?: number;
  expenseTrend?: number;
  rule503020?: Rule503020Summary;
  rule50_30_20?: Rule503020Summary;
  categorySummary?: readonly { name: string; value: number }[];
  monthlyHistory?: readonly {
    month: string;
    income: number;
    expenses: number;
  }[];
}

interface InsightsProfileSummary extends InsightsUserSummary {
  userSummary?: InsightsUserSummary;
  topMonthlyExpenses?: readonly { category: string; amount: number }[];
  activeGoals?: readonly {
    title: string;
    targetAmount: string | number;
    currentAmount: string | number;
    deadline: string | Date | null;
  }[];
  activeBudgets?: readonly {
    categoryId: string | null;
    amount: string | number;
  }[];
  data?: readonly unknown[];
  recentTransactions?: readonly {
    description: string;
    amount: string | number;
    date: string | Date;
    type: 'INCOME' | 'EXPENSE';
  }[];
}

type InsightsInput = InsightsProfileSummary | readonly unknown[];

type ClassificationMap = { [key: string]: ClassificationResult };

type CleanDescriptionsMap = { [key: string]: string };

interface ReceiptContentTextPart {
  type: 'text';
  text: string;
}

interface ReceiptContentFilePart {
  type: 'file';
  file_url: { url: string };
}

interface ReceiptContentImagePart {
  type: 'image_url';
  image_url: { url: string };
}

type ReceiptContentPart =
  | ReceiptContentTextPart
  | ReceiptContentFilePart
  | ReceiptContentImagePart;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;

  // Modelos configuráveis via .env com fallbacks. Ox Alpha aceita imagens e
  // response_format JSON, por isso é adequado à extração de comprovantes.
  private readonly VISION_MODEL =
    process.env.AI_VISION_MODEL || 'stealth/ox-alpha';
  private readonly TEXT_MODEL =
    process.env.AI_TEXT_MODEL || 'openai/gpt-4o-mini';

  constructor() {
    // Prioridade: AI_API_KEY > OPENROUTER_API_KEY
    const apiKey = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY;
    const baseURL = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';

    if (apiKey) {
      const isZen = baseURL.includes('opencode.ai');
      const headers: HeaderMap = {};
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
  ): Promise<ClassificationMap> {
    if (!this.openai || descriptions.length === 0) {
      return this.fallbackClassification(descriptions);
    }

    const prompt = `${SYSTEM_PROMPTS.CLASSIFIER(categories)}\n\nDados:\n${JSON.stringify(descriptions)}`;

    try {
      this.logger.log(
        `OpenRouter: Classificando ${descriptions.length} transações...`,
      );

      const request: ChatCompletionCreateParamsNonStreaming = {
        model: this.TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      };

      const response: ChatCompletion =
        await this.openai.chat.completions.create(request);

      const responseText = response.choices[0]?.message?.content || '{}';

      // Tenta limpar possíveis marcações de markdown do JSON
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      const rawData = this.parseJson(cleanJson);

      // Algumas IAs podem envolver o resultado em uma chave "transactions" ou similar
      const dataToProcess = this.extractClassificationSource(rawData);

      const parsedData: ClassificationMap = {};
      for (const [key, value] of Object.entries(dataToProcess)) {
        const classification = this.toClassificationResult(value);
        if (classification) {
          parsedData[key] = classification;
        }
      }

      return parsedData;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          'Erro na API do OpenRouter ao classificar. Usando fallback.',
          error.stack ?? error.message,
        );
      } else {
        this.logger.error(
          'Erro na API do OpenRouter ao classificar. Usando fallback.',
          String(error),
        );
      }
      return this.fallbackClassification(descriptions);
    }
  }

  /**
   * Gera insights financeiros baseados no resumo do mês.
   */
  async getFinancialInsights(summary: InsightsInput): Promise<string> {
    if (!this.openai) {
      return 'Serviço AI não disponível no momento.';
    }

    const compactSummary = this.buildInsightsSummary(summary);
    const prompt = SYSTEM_PROMPTS.INSIGHTS(compactSummary);

    try {
      this.logger.log(
        `AI: Gerando insights financeiros (${compactSummary.length} chars de contexto)...`,
      );

      const request: ChatCompletionCreateParamsNonStreaming = {
        model: this.TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        reasoning_effort: 'low',
      };

      const response: ChatCompletion =
        await this.openai.chat.completions.create(request);

      return (
        response.choices[0]?.message?.content ||
        'Não foi possível gerar insights agora. Tente novamente mais tarde.'
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          'Erro ao gerar insights via IA:',
          error.stack ?? error.message,
        );
      } else {
        this.logger.error('Erro ao gerar insights via IA:', String(error));
      }
      return 'Erro na conexão com a inteligência artificial.';
    }
  }

  /**
   * Keep dashboard insights fast and reliable on free reasoning models.
   * The full financial profile can be large and may include raw encrypted values
   * from direct Prisma reads. Insights only need dashboard aggregates + top risks.
   */
  private buildInsightsSummary(summary: InsightsInput): string {
    const profile = this.normalizeInsightsProfile(summary);
    const userSummary: InsightsUserSummary = profile.userSummary ?? profile;
    const currentMonth: InsightsMonthSummary = userSummary.currentMonth ?? {};
    const rule503020: Rule503020Summary =
      userSummary.rule503020 ?? userSummary.rule50_30_20 ?? {};
    const categorySummary = Array.isArray(userSummary.categorySummary)
      ? userSummary.categorySummary.slice(0, 6)
      : [];
    const topMonthlyExpenses = Array.isArray(profile.topMonthlyExpenses)
      ? profile.topMonthlyExpenses.slice(0, 5)
      : [];
    const monthlyHistory = Array.isArray(userSummary.monthlyHistory)
      ? userSummary.monthlyHistory.slice(-4)
      : [];

    const activeGoalsCount = Array.isArray(profile.activeGoals)
      ? profile.activeGoals.length
      : 0;
    const activeBudgetsCount = Array.isArray(profile.activeBudgets)
      ? profile.activeBudgets.length
      : 0;

    return JSON.stringify(
      {
        currentMonth: {
          income: currentMonth.income ?? userSummary.currentIncome ?? 0,
          expenses: currentMonth.expense ?? userSummary.currentExpense ?? 0,
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
  ): Promise<CleanDescriptionsMap> {
    if (!this.openai || descriptions.length === 0) {
      return {};
    }

    try {
      this.logger.log('OpenRouter: Limpando nomes de transações...');

      const request: ChatCompletionCreateParamsNonStreaming = {
        model: this.TEXT_MODEL,
        messages: [
          {
            role: 'user',
            content: `${SYSTEM_PROMPTS.CLEANER}\n\nDADOS:\n${JSON.stringify(descriptions)}`,
          },
        ],
        response_format: { type: 'json_object' },
      };

      const response: ChatCompletion =
        await this.openai.chat.completions.create(request);

      const responseText = response.choices[0]?.message?.content || '{}';
      return this.parseStringMap(responseText);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          'Erro ao limpar descrições via OpenRouter:',
          error.stack ?? error.message,
        );
      } else {
        this.logger.error(
          'Erro ao limpar descrições via OpenRouter:',
          String(error),
        );
      }
      return {};
    }
  }

  /**
   * Chat financeiro interativo que recebe contexto profundo do perfil.
   */
  async chat(message: string, profile: InsightsInput): Promise<string> {
    if (!this.openai) {
      return 'Serviço de chat não disponível.';
    }

    const prompt = SYSTEM_PROMPTS.CHAT(JSON.stringify(profile, null, 2));

    try {
      this.logger.log(
        `OpenRouter: Processando chat - "${message.substring(0, 30)}..."`,
      );

      const request: ChatCompletionCreateParamsNonStreaming = {
        model: this.TEXT_MODEL,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
      };

      const response: ChatCompletion =
        await this.openai.chat.completions.create(request);

      return (
        response.choices[0]?.message?.content ||
        'Desculpe, não consegui processar sua pergunta agora.'
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          'Erro no chat via OpenRouter:',
          error.stack ?? error.message,
        );
      } else {
        this.logger.error('Erro no chat via OpenRouter:', String(error));
      }
      return 'Ocorreu um erro ao conversar com a IA.';
    }
  }

  /**
   * Análise Preditiva - Com base no histórico de gastos recentes,
   * prevê como o mês atual vai terminar e destaca riscos.
   */
  async getSpendingForecast(historicalData: InsightsInput): Promise<string> {
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

      const request: ChatCompletionCreateParamsNonStreaming = {
        model: this.TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      };

      const response: ChatCompletion =
        await this.openai.chat.completions.create(request);

      return (
        response.choices[0]?.message?.content ||
        'Não foi possível gerar a previsão no momento.'
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          'Erro ao gerar previsão via OpenRouter:',
          error.stack ?? error.message,
        );
      } else {
        this.logger.error(
          'Erro ao gerar previsão via OpenRouter:',
          String(error),
        );
      }
      return 'Erro na conexão com a inteligência artificial.';
    }
  }

  /**
   * Análise Preditiva - Identifica possíveis assinaturas pagas
   * ou serviços esquecidos recorrentes nos últimos meses.
   */
  async findRecurringSubscriptions(
    recentTransactions: InsightsInput,
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

      const request: ChatCompletionCreateParamsNonStreaming = {
        model: this.TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      };

      const response: ChatCompletion =
        await this.openai.chat.completions.create(request);

      return (
        response.choices[0]?.message?.content ||
        'Não foi possível encontrar assinaturas no momento.'
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          'Erro ao procurar assinaturas via OpenRouter:',
          error.stack ?? error.message,
        );
      } else {
        this.logger.error(
          'Erro ao procurar assinaturas via OpenRouter:',
          String(error),
        );
      }
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
      const contentParts: ReceiptContentPart[] = [
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

      const userMessage: ChatCompletionUserMessageParam = {
        role: 'user',
        content: contentParts as unknown as
          | string
          | ChatCompletionContentPart[],
      };

      const request: ChatCompletionCreateParamsNonStreaming = {
        model: this.VISION_MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.VISION_EXTRACTOR(categories),
          },
          userMessage,
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
        // Ox Alpha é um modelo de raciocínio; limitar o esforço evita estourar
        // o timeout de 60s em uma simples leitura de comprovante.
        reasoning_effort: 'low',
      };

      const response: ChatCompletion =
        await this.openai.chat.completions.create(request);

      const responseText = response.choices[0]?.message?.content || '{}';
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      const rawData = this.parseJson(cleanJson);

      const parsed = this.extractReceiptTransactions(rawData);

      if (parsed.length === 0) {
        return { transactions: [], error: 'no_data_found' };
      }

      return { transactions: parsed as ReceiptTransaction[], error: null };
    } catch (error: unknown) {
      const status =
        error instanceof Error
          ? (error as Error & { status?: number }).status
          : undefined;
      if (error instanceof Error) {
        this.logger.error(
          'Erro ao extrair via OpenRouter Vision:',
          error.stack ?? error.message,
        );
      } else {
        this.logger.error(
          'Erro ao extrair via OpenRouter Vision:',
          String(error),
        );
      }

      if (status === 400 || status === 422) {
        return { transactions: [], error: 'unsupported_format' };
      }
      if (status === 429) {
        return { transactions: [], error: 'rate_limit' };
      }
      if (status === 500 || status === 503) {
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

      const request: ChatCompletionCreateParamsNonStreaming = {
        model: this.TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
      };

      const response: ChatCompletion =
        await this.openai.chat.completions.create(request);

      const responseText = response.choices[0]?.message?.content || '{}';
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      const rawData = this.parseJson(cleanJson);

      const parsed = this.extractReceiptTransactions(rawData);

      if (parsed.length === 0) {
        return { transactions: [], error: 'no_data_found' };
      }

      return { transactions: parsed as ReceiptTransaction[], error: null };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error('Erro ao extrair via OCR + IA:', message);
      return { transactions: [], error: 'unknown_error' };
    }
  }

  private normalizeInsightsProfile(
    summary: InsightsInput,
  ): InsightsProfileSummary {
    if (Array.isArray(summary)) {
      const data: readonly unknown[] = summary;
      return { data };
    }

    return summary as InsightsProfileSummary;
  }

  private parseJson(text: string): unknown {
    return JSON.parse(text) as unknown;
  }

  private isUnknownObject(value: unknown): value is UnknownObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private parseStringMap(rawData: unknown): CleanDescriptionsMap {
    if (!this.isUnknownObject(rawData)) {
      return {};
    }

    const result: CleanDescriptionsMap = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (typeof value === 'string') {
        result[key] = value;
      }
    }

    return result;
  }

  private extractClassificationSource(
    rawData: unknown,
  ): UnknownObject | readonly unknown[] {
    if (Array.isArray(rawData)) {
      return rawData as readonly unknown[];
    }

    if (!this.isUnknownObject(rawData)) {
      return {};
    }

    const transactions = rawData.transactions;
    if (Array.isArray(transactions)) {
      return transactions as readonly unknown[];
    }
    if (this.isUnknownObject(transactions)) {
      return transactions;
    }

    const classifications = rawData.classifications;
    if (Array.isArray(classifications)) {
      return classifications as readonly unknown[];
    }
    if (this.isUnknownObject(classifications)) {
      return classifications;
    }

    return rawData;
  }

  private toClassificationResult(value: unknown): ClassificationResult | null {
    if (!this.isUnknownObject(value)) {
      return null;
    }

    const category =
      typeof value.c === 'string'
        ? value.c
        : typeof value.category === 'string'
          ? value.category
          : 'Outros';
    const rule =
      typeof value.r === 'number'
        ? value.r
        : typeof value.rule === 'number'
          ? value.rule
          : 30;
    const icon =
      typeof value.i === 'string'
        ? value.i
        : typeof value.icon === 'string'
          ? value.icon
          : '🏷️';
    const cleanName =
      typeof value.n === 'string'
        ? value.n
        : typeof value.cleanName === 'string'
          ? value.cleanName
          : undefined;
    const confidence =
      typeof value.confidence === 'number' ? value.confidence : undefined;

    const classification: ClassificationResult = {
      category,
      rule,
      icon,
    };

    if (cleanName !== undefined) {
      classification.cleanName = cleanName;
    }

    if (confidence !== undefined) {
      classification.confidence = confidence;
    }

    return classification;
  }

  private extractReceiptTransactions(rawData: unknown): readonly unknown[] {
    if (Array.isArray(rawData)) {
      return rawData as readonly unknown[];
    }

    if (!this.isUnknownObject(rawData)) {
      return [];
    }

    const candidates = [
      rawData.transactions,
      rawData.data,
      rawData.items,
      rawData.results,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private fallbackClassification(descriptions: string[]): ClassificationMap {
    const result: ClassificationMap = {};
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
