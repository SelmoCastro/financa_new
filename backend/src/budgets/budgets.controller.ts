import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller({
  path: 'budgets',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) { }

  @Post()
  create(@Body() createBudgetDto: CreateBudgetDto, @Request() req) {
    return this.budgetsService.create(createBudgetDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.budgetsService.findAll(req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBudgetDto: UpdateBudgetDto, @Request() req) {
    return this.budgetsService.update(id, updateBudgetDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.budgetsService.remove(id, req.user.userId);
  }
}
