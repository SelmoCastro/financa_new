/**
 * Controller HTTP do domínio de cartões de crédito; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
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
} from '@nestjs/common';
import { CreditCardsService } from './credit-cards.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { CreateInstallmentDto } from './dto/create-installment.dto';
import { UpdateInstallmentDto } from './dto/update-installment.dto';
import { AuthGuard } from '@nestjs/passport';
import { RequireVerifiedEmail } from '../auth/require-verified-email.decorator';
import { PlanGuard, REQUIRED_PLAN_KEY } from '../subscription/plan.guard';
import { SetMetadata } from '@nestjs/common';
import { RequestWithUser } from '../common/types/request-with-user';

@Controller({
  path: 'credit-cards',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Post()
  @RequireVerifiedEmail()
  @UseGuards(PlanGuard)
  @SetMetadata(REQUIRED_PLAN_KEY, 'free')
  create(
    @Body() createCreditCardDto: CreateCreditCardDto,
    @Request() req: RequestWithUser,
  ) {
    return this.creditCardsService.create(createCreditCardDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.creditCardsService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.creditCardsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @RequireVerifiedEmail()
  update(
    @Param('id') id: string,
    @Body() updateCreditCardDto: UpdateCreditCardDto,
    @Request() req: RequestWithUser,
  ) {
    return this.creditCardsService.update(
      id,
      updateCreditCardDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @RequireVerifiedEmail()
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.creditCardsService.remove(id, req.user.userId);
  }

  // ─── Installment Endpoints ───

  @Post(':cardId/installments')
  @RequireVerifiedEmail()
  createInstallment(
    @Param('cardId') cardId: string,
    @Body() dto: CreateInstallmentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.creditCardsService.createInstallment(
      cardId,
      dto,
      req.user.userId,
    );
  }

  @Get(':cardId/installments')
  getInstallments(
    @Param('cardId') cardId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.creditCardsService.getInstallments(req.user.userId, cardId);
  }

  @Get('installments/all')
  getAllInstallments(@Request() req: RequestWithUser) {
    return this.creditCardsService.getInstallments(req.user.userId);
  }

  @Get('installments/:id/schedule')
  getInstallmentSchedule(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.creditCardsService.getInstallmentScheduleForUser(
      id,
      req.user.userId,
    );
  }

  @Patch('installments/:id')
  @RequireVerifiedEmail()
  updateInstallment(
    @Param('id') id: string,
    @Body() dto: UpdateInstallmentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.creditCardsService.updateInstallment(id, dto, req.user.userId);
  }

  @Delete('installments/:id')
  @RequireVerifiedEmail()
  deleteInstallment(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.creditCardsService.deleteInstallment(id, req.user.userId);
  }
}
