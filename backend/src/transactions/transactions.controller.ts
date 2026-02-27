import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, Res, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ImportValidateTransactionDto, ImportConfirmPayloadDto } from './dto/import-transaction.dto';
import { AiService } from '../ai/ai.service';
import { ReportsService } from '../reports/reports.service';
import { memoryStorage } from 'multer';


@Controller({
  path: 'transactions',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly aiService: AiService,
    private readonly reportsService: ReportsService,
  ) { }

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto, @Request() req) {
    return this.transactionsService.create(createTransactionDto, req.user.userId);
  }

  @Post('import/validate')
  validateImport(@Body() importData: ImportValidateTransactionDto[], @Request() req) {
    return this.transactionsService.validateImport(importData, req.user.userId);
  }

  @Post('import/receipt')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Tipo de arquivo não suportado: ${file.mimetype}. Use JPG, PNG, WEBP ou PDF.`), false);
      }
    },
  }))
  async importReceipt(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const imageBase64 = file.buffer.toString('base64');

    // Busca categorias do usuário para a IA saber o que sugerir
    const userCategories = await this.transactionsService.getUserCategories(req.user.userId);
    const categoryNames = userCategories.map(c => c.name);

    const transactions = await this.aiService.extractFromReceipt(imageBase64, file.mimetype, categoryNames);

    if (transactions.length === 0) {
      return {
        preview: [],
        message: 'Não foi possível extrair transações deste arquivo. Tente com uma imagem mais nítida.'
      };
    }

    return { preview: transactions };
  }

  @Post('import/confirm')
  confirmImport(@Body() payload: ImportConfirmPayloadDto, @Request() req) {
    return this.transactionsService.confirmImport(
      payload.transactions,
      req.user.userId,
      payload.rejectedFitIds || []
    );
  }

  @Get()
  findAll(@Request() req, @Query('year') year?: string, @Query('month') month?: string) {
    return this.transactionsService.findAll(
      req.user.userId,
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined
    );
  }

  @Get('dashboard-summary')
  getDashboardSummary(@Request() req, @Query('year') year?: string, @Query('month') month?: string) {
    return this.reportsService.getDashboardSummary(
      req.user.userId,
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined
    );
  }

  @Get('export')
  async export(@Request() req, @Res() res: Response) {
    const csvData = await this.transactionsService.export(req.user.userId);
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment('financa_export.csv');
    // Adiciona o BOM para o Excel reconhecer UTF-8
    res.send('\uFEFF' + csvData);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.transactionsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto, @Request() req) {
    return this.transactionsService.update(id, updateTransactionDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.transactionsService.remove(id, req.user.userId);
  }
}
