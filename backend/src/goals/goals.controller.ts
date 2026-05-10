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
  NotFoundException,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AuthGuard } from '@nestjs/passport';
import { RequireVerifiedEmail } from '../auth/require-verified-email.decorator';
import { PlanGuard, REQUIRED_PLAN_KEY } from '../subscription/plan.guard';
import { SetMetadata } from '@nestjs/common';

@Controller({
  path: 'goals',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @RequireVerifiedEmail()
  @UseGuards(PlanGuard)
  @SetMetadata(REQUIRED_PLAN_KEY, 'free')
  create(@Body() createGoalDto: CreateGoalDto, @Request() req) {
    return this.goalsService.create(createGoalDto, req.user.userId);
  }

  @Post(':id/deposit')
  @RequireVerifiedEmail()
  async deposit(
    @Param('id') id: string,
    @Body() body: { amount: number },
    @Request() req,
  ) {
    const goal = await this.goalsService.findOne(id, req.user.userId);
    if (!goal) throw new NotFoundException('Meta não encontrada');
    
    const currentAmount = Number(goal.currentAmount) + Number(body.amount);
    return this.goalsService.update(id, { currentAmount } as any, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.goalsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.goalsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @RequireVerifiedEmail()
  update(
    @Param('id') id: string,
    @Body() updateGoalDto: UpdateGoalDto,
    @Request() req,
  ) {
    return this.goalsService.update(id, updateGoalDto, req.user.userId);
  }

  @Delete(':id')
  @RequireVerifiedEmail()
  remove(@Param('id') id: string, @Request() req) {
    return this.goalsService.remove(id, req.user.userId);
  }
}
