import { Injectable, Logger } from '@nestjs/common';

export interface ExchangeRates {
  USD: number; // 1 BRL = X USD
  EUR: number; // 1 BRL = X EUR
  date: string;
  source: string;
}

interface CacheEntry {
  rates: ExchangeRates;
  fetchedAt: number;
}

interface FrankfurterResponse {
  rates?: {
    USD?: number | string;
    EUR?: number | string;
  };
  date?: string;
}

interface BcbResponse {
  value?: Array<{
    cotacaoVenda?: number | string;
  }>;
}

/**
 * Serviço de cotação multi-camada:
 * 1. Frankfurter (primário — grátis, sem key, multi-moeda)
 * 2. BCB PTAX (fallback USD — oficial, grátis)
 * 3. Cache 1h em memória
 * 4. Cache expirado como último recurso
 */
@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private cache: CacheEntry | null = null;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hora

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private async readJson(response: Response): Promise<unknown> {
    return response.json() as Promise<unknown>;
  }

  /**
   * Retorna as taxas de câmbio BRL → USD/EUR.
   * Público — não requer autenticação.
   */
  async getRates(): Promise<ExchangeRates> {
    const cached = this.getFromCache();
    if (cached) return cached;

    // Tenta Frankfurter primeiro
    try {
      const rates = await this.fetchFrankfurter();
      this.setCache(rates);
      return rates;
    } catch (error: unknown) {
      this.logger.warn(`Frankfurter falhou: ${this.getErrorMessage(error)}`);
    }

    // Fallback: BCB PTAX (USD) + Frankfurter só EUR
    try {
      const rates = await this.fetchBCBWithEURFallback();
      this.setCache(rates);
      return rates;
    } catch (error: unknown) {
      this.logger.warn(`BCB fallback falhou: ${this.getErrorMessage(error)}`);
    }

    // Último recurso: cache expirado
    if (this.cache) {
      this.logger.warn(
        `Usando cache expirado de ${new Date(this.cache.fetchedAt).toISOString()}`,
      );
      return { ...this.cache.rates, source: 'cache-expired' };
    }

    // Nada funcionou — retorna fallback hardcoded
    this.logger.error('Todas as fontes de cotação falharam!');
    return {
      USD: 0.1835,
      EUR: 0.168,
      date: new Date().toISOString().slice(0, 10),
      source: 'fallback-hardcoded',
    };
  }

  // ─── Cache ───────────────────────────────────────

  private getFromCache(): ExchangeRates | null {
    if (!this.cache) return null;
    if (Date.now() - this.cache.fetchedAt < this.CACHE_TTL) {
      return {
        ...this.cache.rates,
        source: this.cache.rates.source + '-cached',
      };
    }
    return null;
  }

  private setCache(rates: ExchangeRates): void {
    this.cache = { rates, fetchedAt: Date.now() };
  }

  // ─── Frankfurter API (primário) ──────────────────

  private async fetchFrankfurter(): Promise<ExchangeRates> {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=BRL&to=USD,EUR',
      { signal: AbortSignal.timeout(5000) },
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await this.readJson(res)) as FrankfurterResponse;
    const usd = data.rates?.USD;
    const eur = data.rates?.EUR;

    if (
      typeof usd === 'undefined' ||
      typeof eur === 'undefined' ||
      typeof data.date !== 'string'
    ) {
      throw new Error('Resposta inválida da Frankfurter');
    }

    return {
      USD: Number(usd),
      EUR: Number(eur),
      date: data.date,
      source: 'frankfurter',
    };
  }

  // ─── BCB PTAX (fallback USD) ─────────────────────

  private async fetchBCBWithEURFallback(): Promise<ExchangeRates> {
    const today = this.formatDateBCB(new Date());

    // BCB para USD
    const bcbRes = await fetch(
      `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${today}'&$top=1&$format=json`,
      { signal: AbortSignal.timeout(5000) },
    );

    let usdRate = 0;
    if (bcbRes.ok) {
      const bcbData = (await this.readJson(bcbRes)) as BcbResponse;
      const cotacao = bcbData.value?.[0]?.cotacaoVenda;
      if (typeof cotacao !== 'undefined') {
        // BCB retorna BRL por 1 USD — inverter
        const cotacaoNumerica = Number(cotacao);
        if (Number.isFinite(cotacaoNumerica) && cotacaoNumerica !== 0) {
          usdRate = 1 / cotacaoNumerica;
        }
      }
    }

    // Se BCB falhou pro USD, tenta Frankfurter só USD
    if (!usdRate) {
      const ffRes = await fetch(
        'https://api.frankfurter.app/latest?from=BRL&to=USD',
        { signal: AbortSignal.timeout(5000) },
      );
      if (ffRes.ok) {
        const ffData = (await this.readJson(ffRes)) as FrankfurterResponse;
        const usd = ffData.rates?.USD;
        if (typeof usd === 'undefined') {
          usdRate = 0.1835; // fallback hardcoded
        } else {
          usdRate = Number(usd);
        }
      } else {
        usdRate = 0.1835; // fallback hardcoded
      }
    }

    // EUR via Frankfurter (BCB não tem endpoint simples pra EUR)
    let eurRate = 0;
    try {
      const eurRes = await fetch(
        'https://api.frankfurter.app/latest?from=BRL&to=EUR',
        { signal: AbortSignal.timeout(5000) },
      );
      if (eurRes.ok) {
        const eurData = (await this.readJson(eurRes)) as FrankfurterResponse;
        const eur = eurData.rates?.EUR;
        if (typeof eur === 'undefined') {
          throw new Error('Resposta inválida da Frankfurter');
        }

        eurRate = Number(eur);
      }
    } catch (error: unknown) {
      void error;
      // EUR via cross-rate USD/EUR
      eurRate = usdRate * 0.92; // aproximação
    }

    return {
      USD: usdRate,
      EUR: eurRate || usdRate * 0.92,
      date: new Date().toISOString().slice(0, 10),
      source: 'bcb+fallback',
    };
  }

  private formatDateBCB(date: Date): string {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const y = date.getFullYear();
    return `${m}-${d}-${y}`;
  }
}
