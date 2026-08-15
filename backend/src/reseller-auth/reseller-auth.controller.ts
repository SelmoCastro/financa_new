/**
 * Controller HTTP do domínio de autenticação de revendedores; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request as ExpressRequest } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ResellerAuthService } from './reseller-auth.service';
import { ResellerLoginDto } from './dto/reseller-login.dto';
import { ResellerRefreshDto } from './dto/reseller-refresh.dto';
import { RequestWithReseller } from '../common/types/request-with-reseller';
import {
  RESELLER_ACCESS_COOKIE,
  RESELLER_REFRESH_COOKIE,
} from '../resellers/reseller.constants';

type RequestWithCookies = Omit<ExpressRequest, 'cookies'> & {
  cookies?: Record<string, string | undefined>;
};

@Controller({
  path: 'reseller-portal/auth',
  version: '1',
})
export class ResellerAuthController {
  constructor(private readonly resellerAuthService: ResellerAuthService) {}

  // Cookies separados impedem colisão com a sessão do usuário final do dashboard comum.
  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(RESELLER_ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie(RESELLER_REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private clearCookies(res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
    };

    res.clearCookie(RESELLER_ACCESS_COOKIE, cookieOptions);
    res.clearCookie(RESELLER_REFRESH_COOKIE, cookieOptions);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() dto: ResellerLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Primeiro valida credenciais e status; só depois persiste a sessão nos cookies do navegador.
    const reseller = await this.resellerAuthService.validateReseller(
      dto.email,
      dto.password,
    );
    const result = await this.resellerAuthService.login(reseller);
    this.setCookies(res, result.access_token, result.refreshToken);
    return result;
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('refresh')
  async refresh(
    @Body() dto: ResellerRefreshDto,
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Permite refresh por cookie HttpOnly ou payload explícito, o que ajuda tanto navegador quanto clientes alternativos.
    const refreshToken =
      req.cookies?.[RESELLER_REFRESH_COOKIE] || dto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token ausente');
    }

    const result = await this.resellerAuthService.refreshTokens(refreshToken);
    this.setCookies(res, result.access_token, result.refreshToken);
    return result;
  }

  @Get('me')
  @UseGuards(AuthGuard('reseller-jwt'))
  async me(@Req() req: RequestWithReseller) {
    return {
      reseller: await this.resellerAuthService.getProfile(req.user.resellerId),
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard('reseller-jwt'))
  async logout(
    @Req() req: RequestWithReseller,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Limpa cookie antes mesmo do service responder para evitar sessão fantasma no browser.
    this.clearCookies(res);
    return this.resellerAuthService.logout(req.user.resellerId);
  }
}
