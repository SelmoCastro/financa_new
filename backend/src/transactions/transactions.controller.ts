import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, Res } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ImportValidateTransactionDto, ImportConfirmTransactionDto } from './dto/import-transaction.dto';

@Controller({
  path: 'transactions',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) { }

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto, @Request() req) {
    return this.transactionsService.create(createTransactionDto, req.user.userId);
  }

  @Post('import/validate')
  validateImport(@Body() importData: ImportValidateTransactionDto[], @Request() req) {
    return this.transactionsService.validateImport(importData, req.user.userId);
  }

  @Post('import/confirm')
  confirmImport(@Body() importData: ImportConfirmTransactionDto[], @Request() req) {
    return this.transactionsService.confirmImport(importData, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.transactionsService.findAll(req.user.userId);
  }

  @Get('dashboard-summary')
  getDashboardSummary(@Request() req) {
    return this.transactionsService.getDashboardSummary(req.user.userId);
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
