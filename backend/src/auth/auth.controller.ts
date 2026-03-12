
import { Controller, Post, Body, UseGuards, Request, Get, UnauthorizedException, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Response, Request as ExpressRequest } from 'express';

@Controller({
  path: 'auth',
  version: '1',
})
@Throttle({ default: { limit: 5, ttl: 60000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // Permite PWA Mobile via webview/app
      maxAge: 15 * 60 * 1000, // 15 Minutos (em ms)
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Dias (em ms)
    });
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto, @Res({ passthrough: true }) res: Response) {
    const responseData = await this.authService.register(createUserDto);
    this.setCookies(res, responseData.access_token, responseData.refreshToken);
    // Removemos os tokens do body enviado ao cliente para não ficarem soltos,
    // mas por compatibilidade com Mobile que usa JSON, mantermos apenas o de access
    return {
      message: responseData.message,
      userId: responseData.userId,
      access_token: responseData.access_token,
      user: responseData.user,
    };
  }

  @Post('login')
  async login(@Body() req, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(req.email, req.password);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const responseData = await this.authService.login(user);
    this.setCookies(res, responseData.access_token, responseData.refreshToken);

    return {
      access_token: responseData.access_token,
      refreshToken: responseData.refreshToken,
      user: responseData.user,
    };
  }

  @Post('refresh')
  async refresh(@Req() request: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    let refreshToken = request.cookies?.refresh_token;

    // Se mobile estiver enviando no body em vez de cookie
    if (!refreshToken && request.body?.refreshToken) {
      refreshToken = request.body.refreshToken;
    }

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh Token ausente');
    }

    // Identificar o userId (Pode extrair do payload decodificado puro se preciso ou exigir envio do ID)
    // Para simplificar, Mobile/Web podem mandar o UserID no body do refresh
    const userId = request.body?.userId;
    if (!userId) {
      throw new UnauthorizedException('User ID requerido no body para o refresh');
    }

    const responseData = await this.authService.refreshTokens(userId, refreshToken);
    this.setCookies(res, responseData.access_token, responseData.refreshToken);

    return {
      access_token: responseData.access_token,
      refreshToken: responseData.refreshToken
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.userId);

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' as const : 'lax' as const,
    };

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    return { message: 'Desconectado com sucesso' };
  }

  @Post('verify-email')
  verifyEmail(@Body() body: { token: string }) {
    if (!body.token) throw new UnauthorizedException('Token is required');
    return this.authService.verifyEmail(body.token);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    if (!body.email) throw new UnauthorizedException('Email is required');
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { token: string; password: string }) {
    if (!body.token || !body.password) throw new UnauthorizedException('Token and new password are required');
    return this.authService.resetPassword(body.token, body.password);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req) {
    const user = await this.authService.getFullProfile(req.user.userId);
    return { user };
  }
}
