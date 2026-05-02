import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Request,
} from '@nestjs/common';
import { RecurringTransactionsService } from './recurring-transactions.service';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller({ path: 'recurring-transactions', version: '1' })
@UseGuards(AuthGuard('jwt'))
export class RecurringTransactionsController {
  constructor(private readonly service: RecurringTransactionsService) {}

  @Post()
  create(@Body() dto: CreateRecurringTransactionDto, @Request() req) {
    return this.service.create(dto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.userId);
  }

  @Get('weight')
  getWeight(@Request() req) {
    return this.service.getWeight(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.service.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecurringTransactionDto, @Request() req) {
    return this.service.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, req.user.userId);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Request() req) {
    return this.service.toggle(id, req.user.userId);
  }
}
