/**
 * Controller HTTP do domínio de revendedores e créditos; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestWithReseller } from '../common/types/request-with-reseller';
import { ResellersService } from './resellers.service';
import { LookupUserByEmailDto } from './dto/lookup-user-by-email.dto';
import { ActivatePremiumDto } from './dto/activate-premium.dto';

@Controller({
  path: 'reseller-portal',
  version: '1',
})
@UseGuards(AuthGuard('reseller-jwt'))
export class ResellerPortalController {
  constructor(private readonly resellersService: ResellersService) {}

  @Get('me')
  async me(@Req() req: RequestWithReseller) {
    return this.resellersService.getResellerProfile(req.user.resellerId);
  }

  @Get('dashboard')
  async dashboard(@Req() req: RequestWithReseller) {
    return this.resellersService.getPortalDashboard(req.user.resellerId);
  }

  @Get('ledger')
  async ledger(@Req() req: RequestWithReseller) {
    return this.resellersService.getPortalLedger(req.user.resellerId);
  }

  @Get('activations')
  async activations(@Req() req: RequestWithReseller) {
    return this.resellersService.getPortalActivations(req.user.resellerId);
  }

  @Post('lookup-user')
  async lookupUser(
    @Req() req: RequestWithReseller,
    @Body() dto: LookupUserByEmailDto,
  ) {
    return this.resellersService.lookupUserByEmail(req.user.resellerId, dto);
  }

  @Post('activate-premium')
  async activatePremium(
    @Req() req: RequestWithReseller,
    @Body() dto: ActivatePremiumDto,
  ) {
    return this.resellersService.activatePremium(req.user.resellerId, dto, {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }
}
