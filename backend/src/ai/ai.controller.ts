import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiService } from './ai.service';
import { ReportsService } from '../reports/reports.service';

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
    constructor(
        private readonly aiService: AiService,
        private readonly reportsService: ReportsService,
    ) { }

    @Get('insights')
    async getInsights(
        @Request() req,
        @Query('year') year?: string,
        @Query('month') month?: string
    ) {
        const userId = req.user.id;
        const now = new Date();
        const y = year ? parseInt(year) : now.getFullYear();
        const m = month ? parseInt(month) : now.getMonth();

        // Obtém o resumo dos dados para o mês selecionado
        const summary = await this.reportsService.getDashboardSummary(userId, y, m);

        // Gera os insights usando o resumo como contexto
        const insights = await this.aiService.getFinancialInsights(summary);

        return { insights };
    }

    @Post('chat')
    async postChat(@Request() req, @Body('message') message: string) {
        const userId = req.user.id;

        // Contexto básico: resumo do mês atual para o chat
        const now = new Date();
        const summary = await this.reportsService.getDashboardSummary(userId, now.getFullYear(), now.getMonth());

        const response = await this.aiService.chat(message, summary);

        return { response };
    }
}
