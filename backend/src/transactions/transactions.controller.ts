import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Res, NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AuthGuard } from '@nestjs/passport';

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

  @Post('import')
  importBatch(@Body() createTransactionsDto: CreateTransactionDto[], @Request() req) {
    return this.transactionsService.importBatch(createTransactionsDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.transactionsService.findAll(req.user.userId);
  }

  @Get('dashboard')
  getDashboard(@Request() req) {
    return this.transactionsService.getDashboardSummary(req.user.userId);
  }

  @Get('export')
  async export(@Request() req, @Res() res) {
    const csv = await this.transactionsService.export(req.user.userId);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="finanza-export.csv"');
    return res.send(csv);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const transaction = await this.transactionsService.findOne(id, req.user.userId);
    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }
    return transaction;
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
