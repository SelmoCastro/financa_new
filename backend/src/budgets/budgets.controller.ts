/**
 * Controller HTTP do domínio de orçamentos; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { AuthGuard } from '@nestjs/passport';
import { RequireVerifiedEmail } from '../auth/require-verified-email.decorator';
import { PlanGuard, REQUIRED_PLAN_KEY } from '../subscription/plan.guard';
import { SetMetadata } from '@nestjs/common';
import { RequestWithUser } from '../common/types/request-with-user';

@Controller({
  path: 'budgets',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @RequireVerifiedEmail()
  @UseGuards(PlanGuard)
  @SetMetadata(REQUIRED_PLAN_KEY, 'free')
  create(
    @Body() createBudgetDto: CreateBudgetDto,
    @Request() req: RequestWithUser,
  ) {
    return this.budgetsService.create(createBudgetDto, req.user.userId);
  }

  @Get()
  findAll(
    @Request() req: RequestWithUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.budgetsService.findAll(
      req.user.userId,
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Patch(':id')
  @RequireVerifiedEmail()
  update(
    @Param('id') id: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
    @Request() req: RequestWithUser,
  ) {
    return this.budgetsService.update(id, updateBudgetDto, req.user.userId);
  }

  @Delete(':id')
  @RequireVerifiedEmail()
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.budgetsService.remove(id, req.user.userId);
  }
}
