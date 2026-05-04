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
  SetMetadata,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AuthGuard } from '@nestjs/passport';
import { RequireVerifiedEmail } from '../auth/require-verified-email.decorator';
import { PlanGuard } from '../subscription/plan.guard';
import { REQUIRED_PLAN_KEY } from '../subscription/plan.guard';

@Controller({
  path: 'accounts',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @RequireVerifiedEmail()
  @UseGuards(PlanGuard) // V15: Enforce plan limits on account creation
  @SetMetadata(REQUIRED_PLAN_KEY, 'free') // V15: Check limits (free=3 accounts max)
  create(@Body() createAccountDto: CreateAccountDto, @Request() req) {
    return this.accountsService.create(createAccountDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.accountsService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.accountsService.findOne(id, req.user.userId);
  }

  @Post(':id/reconcile')
  @RequireVerifiedEmail()
  async reconcile(@Param('id') id: string, @Request() req) {
    return this.accountsService.reconcile(id, req.user.userId);
  }

  @Patch(':id')
  @RequireVerifiedEmail()
  update(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @Request() req,
  ) {
    console.log('[ACCOUNTS] PATCH:', JSON.stringify({ id, body: updateAccountDto, userId: req.user.userId }));
    return this.accountsService.update(id, updateAccountDto, req.user.userId);
  }

  @Delete(':id')
  @RequireVerifiedEmail()
  remove(@Param('id') id: string, @Request() req) {
    return this.accountsService.remove(id, req.user.userId);
  }
}
