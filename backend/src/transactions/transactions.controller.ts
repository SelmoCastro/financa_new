import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
  Res,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseArrayPipe,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionsService } from './transactions.service';
import { TransactionsImportService } from './transactions-import.service';
import { TransactionsTransferService } from './transactions-transfer.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import {
  ImportValidateTransactionDto,
  ImportConfirmPayloadDto,
} from './dto/import-transaction.dto';
import { TransferTransactionDto } from './dto/transfer-transaction.dto';
import { AiService, type ReceiptExtractionResult } from '../ai/ai.service';
import { OcrService } from '../common/services/ocr.service';
import { ReportsService } from '../reports/reports.service';
import { memoryStorage } from 'multer';
import { RequireVerifiedEmail } from '../auth/require-verified-email.decorator';
import { RequestWithUser } from '../common/types/request-with-user';

@Controller({
  path: 'transactions',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly transactionsImportService: TransactionsImportService,
    private readonly transactionsTransferService: TransactionsTransferService,
    private readonly aiService: AiService,
    private readonly reportsService: ReportsService,
    private readonly ocrService: OcrService,
  ) {}

  @Post()
  @RequireVerifiedEmail()
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @Request() req: RequestWithUser,
  ) {
    return this.transactionsService.create(
      createTransactionDto,
      req.user.userId,
    );
  }

  @Post('transfer')
  @RequireVerifiedEmail()
  transfer(
    @Body() transferDto: TransferTransactionDto,
    @Request() req: RequestWithUser,
  ) {
    return this.transactionsTransferService.transfer(
      transferDto,
      req.user.userId,
    );
  }

  @Post('import/validate')
  @RequireVerifiedEmail()
  validateImport(
    @Body(new ParseArrayPipe({ items: ImportValidateTransactionDto }))
    importData: ImportValidateTransactionDto[],
    @Request() req: RequestWithUser,
  ) {
    if (importData && importData.length > 500) {
      throw new BadRequestException('Maximum 500 transactions per import');
    }
    return this.transactionsImportService.validateImport(
      importData,
      req.user.userId,
    );
  }

  @Post('import/receipt')
  @RequireVerifiedEmail()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Tipo de arquivo não suportado: ${file.mimetype}. Use JPG, PNG, WEBP ou PDF.`,
            ),
            false,
          );
        }
      },
    }),
  )
  async importReceipt(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: RequestWithUser,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('Nenhum arquivo enviado.');
      }

      const fileBuffer = file.buffer;
      const mimeType = file.mimetype;

      // Busca categorias do usuário para a IA saber o que sugerir
      const userCategories = await this.transactionsService.getUserCategories(
        req.user.userId,
      );
      const categoryNames = userCategories.map((c) => c.name);

      let result: ReceiptExtractionResult | undefined;
      const isImage = mimeType.startsWith('image/');
      const fileBase64 = fileBuffer.toString('base64');

      // Para imagens, a rota que funcionava melhor antes era visão direta.
      // Mantemos OCR como segunda chance, não como caminho principal.
      if (isImage) {
        this.logger.log('Imagem detectada, usando modelo de visão primeiro...');
        result = await this.aiService.extractFromReceipt(
          fileBase64,
          mimeType,
          categoryNames,
        );

        if (
          result.error === 'no_data_found' ||
          result.error === 'unknown_error'
        ) {
          this.logger.log(
            'Visão não conseguiu extrair dados, tentando OCR local como fallback... ',
          );
          const ocrText = await this.ocrService.extractText(
            fileBuffer,
            mimeType,
          );
          if (ocrText) {
            this.logger.log('OCR local OK, enviando texto para IA...');
            const ocrResult = await this.aiService.extractFromOcrText(
              ocrText,
              categoryNames,
            );
            if (ocrResult.transactions.length > 0) {
              result = ocrResult;
            }
          }
        }
      } else {
        // PDF continua com OCR primeiro; se ficar fraco, cai para visão.
        const ocrText = await this.ocrService.extractText(fileBuffer, mimeType);
        if (ocrText && ocrText.length >= 80) {
          this.logger.log('OCR local OK, enviando texto para IA...');
          result = await this.aiService.extractFromOcrText(
            ocrText,
            categoryNames,
          );

          if (
            result.error === 'no_data_found' ||
            result.error === 'unknown_error'
          ) {
            this.logger.log(
              'OCR em PDF ficou fraco/sem dados, tentando modelo de visão... ',
            );
            result = await this.aiService.extractFromReceipt(
              fileBase64,
              mimeType,
              categoryNames,
            );
          }
        } else {
          // Fallback: envia PDF diretamente para modelo de visão (OpenRouter)
          this.logger.log(
            'OCR falhou/indisponivel ou ficou fraco, usando modelo de visao...',
          );
          result = await this.aiService.extractFromReceipt(
            fileBase64,
            mimeType,
            categoryNames,
          );
        }
      }

      const extractionResult = result;
      if (!extractionResult) {
        return {
          preview: [],
          message:
            'Falha ao processar o comprovante. Verifique se a imagem está legível.',
          errorCode: 'unknown_error',
        };
      }

      if (extractionResult.error) {
        const errorMessages: Record<
          NonNullable<ReceiptExtractionResult['error']>,
          string
        > = {
          service_unavailable:
            'Serviço de IA indisponível no momento. Tente novamente mais tarde.',
          no_data_found:
            'Não foi possível identificar transações neste documento. Verifique se é um comprovante financeiro válido e tente novamente.',
          unsupported_format:
            'Formato de arquivo não suportado pelo modelo de IA. Use JPG, PNG, WEBP ou PDF.',
          rate_limit:
            'Muitas solicitações em sequência. Aguarde um momento e tente novamente.',
          api_error:
            'Erro temporário no serviço de IA. Tente novamente em alguns instantes.',
          unknown_error:
            'Erro inesperado ao processar o documento. Tente novamente.',
        };
        const errorCode = extractionResult.error;
        return {
          preview: [],
          message: errorMessages[errorCode],
          errorCode,
        };
      }

      if (extractionResult.transactions.length === 0) {
        return {
          preview: [],
          message:
            'Nenhuma transação encontrada neste documento. Tente com um comprovante mais nítido.',
          errorCode: 'no_data_found',
        };
      }

      // Mapeia os nomes sugeridos pela IA para os IDs reais do banco usando o novo helper
      const categoryNameToId = new Map(
        userCategories.map((c) => [c.name.toLowerCase().trim(), c.id]),
      );

      // Aprendizado: verifica se o usuário já categorizou cada descrição antes
      const enrichedPreview = await Promise.all(
        extractionResult.transactions.map(async (t) => {
          const learnedCategory =
            await this.transactionsService.findUserCategoryForDescription(
              req.user.userId,
              t.description,
            );

          // Se o usuário já categorizou essa mesma descrição antes, usa a categoria dele
          // em vez da sugestão da IA (aprendizado por correção)
          const effectiveCategory = learnedCategory
            ? learnedCategory.name
            : t.suggestedCategory;

          const suggestion = {
            category: effectiveCategory,
            rule: t.suggestedRule,
            icon: t.suggestedIcon,
            confidence: t.confidence,
          };
          return this.transactionsImportService.enrichTransactionWithAi(
            { ...t, cnpj: t.cnpj },
            suggestion,
            t.description,
            categoryNameToId,
          );
        }),
      );

      return { preview: enrichedPreview };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Erro inesperado ao processar comprovante:',
        errorMessage,
      );
      return {
        preview: [],
        message:
          'Falha ao processar o comprovante. Verifique se a imagem está legível.',
        errorCode: 'unknown_error',
      };
    }
  }

  @Post('import/confirm')
  @RequireVerifiedEmail()
  confirmImport(
    @Body() payload: ImportConfirmPayloadDto,
    @Request() req: RequestWithUser,
  ) {
    return this.transactionsImportService.confirmImport(
      payload.transactions,
      req.user.userId,
      payload.rejectedFitIds || [],
    );
  }

  @Get()
  findAll(
    @Request() req: RequestWithUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    const parsedMonth = month ? parseInt(month, 10) : undefined;
    return this.transactionsService.findAll(
      req.user.userId,
      parsedYear && !isNaN(parsedYear) ? parsedYear : undefined,
      parsedMonth && !isNaN(parsedMonth) ? parsedMonth : undefined,
    );
  }

  @Get('projection')
  getProjection(@Request() req: RequestWithUser) {
    return this.reportsService.getProjection(req.user.userId);
  }

  @Get('dashboard-summary')
  getDashboardSummary(
    @Request() req: RequestWithUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    const parsedMonth = month ? parseInt(month, 10) : undefined;
    return this.reportsService.getDashboardSummary(
      req.user.userId,
      parsedYear !== undefined && !isNaN(parsedYear) ? parsedYear : undefined,
      parsedMonth !== undefined && !isNaN(parsedMonth)
        ? parsedMonth
        : undefined,
    );
  }

  @Get('export')
  async export(@Request() req: RequestWithUser, @Res() res: Response) {
    const csvData = await this.transactionsService.export(req.user.userId);
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment('financa_export.csv');
    // Adiciona o BOM para o Excel reconhecer UTF-8
    res.send('\uFEFF' + csvData);
  }

  @Get('export/report')
  async exportReport(@Request() req: RequestWithUser) {
    return this.transactionsService.exportReport(req.user.userId);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.transactionsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @RequireVerifiedEmail()
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @Request() req: RequestWithUser,
  ) {
    return this.transactionsService.update(
      id,
      updateTransactionDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @RequireVerifiedEmail()
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.transactionsService.remove(id, req.user.userId);
  }
}
