/**
 * Controller HTTP do domínio de câmbio; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
import { Controller, Get, Logger } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';

/**
 * Endpoint público de cotação.
 * NÃO requer autenticação — o frontend precisa acessar antes do login.
 */
@Controller({ path: 'exchange-rate', version: '1' })
export class ExchangeRateController {
  private readonly logger = new Logger(ExchangeRateController.name);

  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get()
  async getRates() {
    const rates = await this.exchangeRateService.getRates();
    this.logger.log(
      `Cotação servida: USD=${rates.USD} EUR=${rates.EUR} fonte=${rates.source}`,
    );
    return rates;
  }
}
