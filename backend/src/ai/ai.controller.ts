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
import { AiChatDto } from './dto/ai-chat.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RequestWithUser } from '../common/types/request-with-user';

@Controller({
  path: 'ai',
  version: '1',
})
@UseGuards(AuthGuard('jwt'), AiRequestGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly reportsService: ReportsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('insights')
  @RequireVerifiedEmail()
  async getInsights(
    @Request() req: RequestWithUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const userId = req.user.userId;
    const now = new Date();
    const y = year ? parseInt(year) : now.getFullYear();
    const m = month ? parseInt(month) : now.getMonth();

    // Obtém o perfil financeiro completo para insights mais inteligentes
    const profile = await this.reportsService.getFinancialProfile(userId, y, m);

    // Conta a requisição antes da chamada externa para evitar bypass por chamadas lentas/falhas.
    await this.prisma.aiRequestLog.create({
      data: { userId, endpoint: 'insights' },
    });

    // Gera os insights usando o perfil como contexto (ajustando para o mês se necessário)
    const insights = await this.aiService.getFinancialInsights(
      profile as unknown as Parameters<
        typeof this.aiService.getFinancialInsights
      >[0],
    );

    return { insights };
  }

  @Post('chat')
  @RequireVerifiedEmail()
  async postChat(@Request() req: RequestWithUser, @Body() body: AiChatDto) {
    const userId = req.user.userId;
    const { message } = body;

    // Contexto completo: metas, orçamentos e gastos
    const profile = await this.reportsService.getFinancialProfile(userId);

    await this.prisma.aiRequestLog.create({
      data: { userId, endpoint: 'chat' },
    });

    const response = await this.aiService.chat(
      message,
      profile as unknown as Parameters<typeof this.aiService.chat>[1],
    );

    return { response };
  }

  @Get('forecast')
  async getForecast(@Request() req: RequestWithUser) {
    const userId = req.user.userId;

    const historicalData =
      await this.reportsService.getHistoricalSpending(userId);
    await this.prisma.aiRequestLog.create({
      data: { userId, endpoint: 'forecast' },
    });

    const forecast = await this.aiService.getSpendingForecast(historicalData);

    return { forecast };
  }

  @Get('subscriptions')
  async getSubscriptions(@Request() req: RequestWithUser) {
    const userId = req.user.userId;

    const recentTxs =
      await this.reportsService.getRecentTransactionsForAudit(userId);
    await this.prisma.aiRequestLog.create({
      data: { userId, endpoint: 'subscriptions' },
    });

    const auditResult =
      await this.aiService.findRecurringSubscriptions(recentTxs);

    return { subscriptions: auditResult };
  }
}
