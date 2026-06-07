/**
 * Controller HTTP do domínio de revendedores e créditos; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/guards/admin.guard';
import { RequestWithUser } from '../common/types/request-with-user';
import { ResellersService } from './resellers.service';
import { CreateResellerDto } from './dto/create-reseller.dto';
import { UpdateResellerStatusDto } from './dto/update-reseller-status.dto';
import { AddResellerCreditsDto } from './dto/add-reseller-credits.dto';

@Controller({
  path: 'admin/resellers',
  version: '1',
})
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class ResellersAdminController {
  constructor(private readonly resellersService: ResellersService) {}

  @Get()
  list(@Request() req: RequestWithUser) {
    return this.resellersService.listResellers(req.user.userId);
  }

  @Post()
  create(@Request() req: RequestWithUser, @Body() dto: CreateResellerDto) {
    return this.resellersService.createReseller(req.user.userId, dto);
  }

  @Get(':id')
  detail(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) resellerId: string,
  ) {
    return this.resellersService.getResellerById(req.user.userId, resellerId);
  }

  @Patch(':id/status')
  updateStatus(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) resellerId: string,
    @Body() dto: UpdateResellerStatusDto,
  ) {
    return this.resellersService.updateResellerStatus(
      req.user.userId,
      resellerId,
      dto.status,
    );
  }

  @Post(':id/credits')
  addCredits(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) resellerId: string,
    @Body() dto: AddResellerCreditsDto,
  ) {
    return this.resellersService.addCredits(req.user.userId, resellerId, dto);
  }

  @Get(':id/ledger')
  ledger(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) resellerId: string,
  ) {
    return this.resellersService.getResellerLedger(req.user.userId, resellerId);
  }

  @Get(':id/activations')
  activations(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) resellerId: string,
  ) {
    return this.resellersService.getResellerActivations(
      req.user.userId,
      resellerId,
    );
  }
}
