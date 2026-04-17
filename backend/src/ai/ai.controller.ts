import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiService } from './ai.service';
import { ReportsService } from '../reports/reports.service';
import { RequireVerifiedEmail } from '../auth/require-verified-email.decorator';
import { AiRequestGuard } from '../subscription/ai-request.guard';

@Controller({
  path: 'ai',
  version: '1',
})
@UseGuards(AuthGuard('jwt'), AiRequestGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly reportsService: ReportsService,
  ) {}

  @Get('insights')
  @RequireVerifiedEmail()
  async getInsights(
    @Request() req,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const userId = req.user.userId;
    const now = new Date();
    const y = year ? parseInt(year) : now.getFullYear();
    const m = month ? parseInt(month) : now.getMonth();

    // Obtém o perfil financeiro completo para insights mais inteligentes
    const profile = await this.reportsService.getFinancialProfile(userId, y, m);

    // Gera os insights usando o perfil como contexto (ajustando para o mês se necessário)
    const insights = await this.aiService.getFinancialInsights(profile);

    return { insights };
  }

  @Post('chat')
  @RequireVerifiedEmail()
  async postChat(@Request() req, @Body('message') message: string) {
    const userId = req.user.userId;

    // Contexto completo: metas, orçamentos e gastos
    const profile = await this.reportsService.getFinancialProfile(userId);

    const response = await this.aiService.chat(message, profile);

    return { response };
  }

  @Get('forecast')
  async getForecast(@Request() req) {
    const userId = req.user.userId;

    const historicalData =
      await this.reportsService.getHistoricalSpending(userId);
    const forecast = await this.aiService.getSpendingForecast(historicalData);

    return { forecast };
  }

  @Get('subscriptions')
  async getSubscriptions(@Request() req) {
    const userId = req.user.userId;

    const recentTxs =
      await this.reportsService.getRecentTransactionsForAudit(userId);
    const auditResult =
      await this.aiService.findRecurringSubscriptions(recentTxs);

    return { subscriptions: auditResult };
  }
}
