import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { Throttle } from '@nestjs/throttler';
import { Response, Request as ExpressRequest } from 'express';

@Controller({
  path: 'auth',
  version: '1',
})
@Throttle({ default: { limit: 5, ttl: 60000 } })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 Minutos (em ms)
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Dias (em ms)
    });
  }

  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const responseData = await this.authService.register(createUserDto);
    this.setCookies(res, responseData.access_token, responseData.refreshToken);
    // Web (cookie auth): refreshToken seguro em HttpOnly cookie.
    // Mobile (Bearer auth): precisa do refreshToken no body.
    const isMobile = req.headers['authorization']?.startsWith('Bearer ') || 
                     !req.cookies?.['access_token'];
    return {
      message: responseData.message,
      userId: responseData.userId,
      access_token: responseData.access_token,
      ...(isMobile && { refreshToken: responseData.refreshToken }),
      user: responseData.user,
    };
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const responseData = await this.authService.login(user);
    this.setCookies(res, responseData.access_token, responseData.refreshToken);

    // Web (cookie auth): refreshToken seguro em HttpOnly cookie, nao no body.
    // Mobile (Bearer auth): precisa do refreshToken no body pois nao usa cookies.
    const isMobile = req.headers['authorization']?.startsWith('Bearer ') || 
                     !req.cookies?.['access_token'];
    return {
      access_token: responseData.access_token,
      ...(isMobile && { refreshToken: responseData.refreshToken }),
      user: responseData.user,
    };
  }

  @Post('refresh')
  async refresh(
    @Body() body: RefreshDto,
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    let refreshToken = request.cookies?.refresh_token;

    // Se mobile estiver enviando no body em vez de cookie
    if (!refreshToken && body.refreshToken) {
      refreshToken = body.refreshToken;
    }

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh Token ausente');
    }

    // Extrair userId do proprio JWT decodificado (nunca confiar no body)
    let userId: string;
    try {
      const decoded = this.authService.decodeJwt(refreshToken);
      userId = decoded.sub;
    } catch {
      throw new UnauthorizedException('Refresh Token inválido');
    }

    if (!userId) {
      throw new UnauthorizedException('Refresh Token inválido: userId ausente');
    }

    const responseData = await this.authService.refreshTokens(
      userId,
      refreshToken,
    );
    this.setCookies(res, responseData.access_token, responseData.refreshToken);

    return {
      access_token: responseData.access_token,
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
      sameSite: 'lax' as const,
    };

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    return { message: 'Desconectado com sucesso' };
  }

  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body.token);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Post('resend-verification')
  @UseGuards(AuthGuard('jwt'))
  async resendVerification(@Request() req) {
    return this.authService.resendVerification(req.user.userId);
  }

  @Post('verify-all-emails')
  @UseGuards(AuthGuard('jwt'))
  async verifyAllEmails(@Request() req) {
    // Apenas admin pode rodar — marca todos usuarios como verificados
    const user = await this.prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user?.isAdmin) {
      throw new ForbiddenException('Admin only');
    }
    const result = await this.prisma.user.updateMany({
      where: { isEmailVerified: false },
      data: { isEmailVerified: true },
    });
    return { message: `${result.count} usuarios marcados como verificados` };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req) {
    const user = await this.authService.getFullProfile(req.user.userId);
    return { user };
  }
}
