import { Controller, Post, Body, UseGuards, Request, Get, UnauthorizedException, BadRequestException, ForbiddenException, Res, Req, Patch, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto, ChangeEmailDto, ChangeNameDto, DeleteAccountDto } from './dto/account-settings.dto';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Response, Request as ExpressRequest } from 'express';
import { AdminGuard } from '../common/guards/admin.guard';
import { RefreshTokenService } from './refresh-token.service';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwtService: JwtService,
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
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Dias (em ms)
    });
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @AuditLog({ action: 'auth.register', targetType: 'User' })
  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    // V5: No PII in production logs
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH] REGISTER - email: ${createUserDto.email}, name: ${createUserDto.name}`);
    }
    const responseData = await this.authService.register(createUserDto);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH] REGISTER OK - userId: ${responseData.userId}, isEmailVerified: ${responseData.user?.isEmailVerified}`);
    }
    this.setCookies(res, responseData.access_token, responseData.refreshToken);
    // V1: Use x-platform header for reliable mobile detection.
    // Web: refreshToken stays in HttpOnly cookie only (never in body).
    // Mobile: refreshToken in body because SecureStore can't access cookies.
    const isMobile = req.headers['x-platform'] === 'mobile' ||
                     req.headers['x-platform'] === 'react-native';
    return {
      message: responseData.message,
      userId: responseData.userId,
      access_token: responseData.access_token,
      ...(isMobile && { refreshToken: responseData.refreshToken }),
      user: responseData.user,
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @AuditLog({ action: 'auth.login', targetType: 'User' })
  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    // V5: No PII in production logs
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH] LOGIN ATTEMPT - email: ${body.email}`);
    }
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AUTH] LOGIN FAILED - email: ${body.email}`);
      }
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const responseData = await this.authService.login(user);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH] LOGIN OK - userId: ${responseData.user?.id}, isEmailVerified: ${responseData.user?.isEmailVerified}`);
    }
    this.setCookies(res, responseData.access_token, responseData.refreshToken);

    // V1: Use x-platform header for reliable mobile detection.
    // Web: refreshToken stays in HttpOnly cookie only (never in body).
    // Mobile: refreshToken in body because SecureStore can't access cookies.
    const isMobile = req.headers['x-platform'] === 'mobile' ||
                     req.headers['x-platform'] === 'react-native';
    return {
      access_token: responseData.access_token,
      ...(isMobile && { refreshToken: responseData.refreshToken }),
      user: responseData.user,
    };
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
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

    // Pilar 1: Try opaque token rotation first (via RefreshTokenService)
    try {
      const result = await this.refreshTokenService.rotateByToken(refreshToken);
      // Generate new access token
      const user = await this.prisma.user.findUnique({ where: { id: result.userId } });
      if (!user) throw new UnauthorizedException('User not found');
      const accessToken = this.jwtService.sign(
        { sub: result.userId, email: user.email, isEmailVerified: user.isEmailVerified, isAdmin: user.isAdmin },
        { expiresIn: '15m' },
      );
      this.setCookies(res, accessToken, result.token);

      const isMobile = request.headers['x-platform'] === 'mobile' ||
                       request.headers['x-platform'] === 'react-native';
      return {
        access_token: accessToken,
        ...(isMobile && { refreshToken: result.token }),
      };
    } catch (err: any) {
      if (err.message === 'REFRESH_TOKEN_REUSE' || err.message === 'REFRESH_TOKEN_EXPIRED') {
        const isMobile = request.headers['x-platform'] === 'mobile' ||
                         request.headers['x-platform'] === 'react-native';
        if (!isMobile) {
          // Web: clear cookies on token reuse — force re-login
          const isProduction = process.env.NODE_ENV === 'production';
          res.clearCookie('access_token', { httpOnly: true, secure: isProduction, sameSite: 'lax' as const });
          res.clearCookie('refresh_token', { httpOnly: true, secure: isProduction, sameSite: 'lax' as const });
        }
        throw new UnauthorizedException('Session expired or compromised. Please login again.');
      }
      // REFRESH_TOKEN_INVALID → fall through to legacy JWT path
    }

    // Legacy JWT flow: extract userId from JWT payload
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

    const responseData = await this.authService.refreshTokens(userId, refreshToken);
    this.setCookies(res, responseData.access_token, responseData.refreshToken);

    const isMobile = request.headers['x-platform'] === 'mobile' ||
                     request.headers['x-platform'] === 'react-native';
    return {
      access_token: responseData.access_token,
      ...(isMobile && { refreshToken: responseData.refreshToken }),
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

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // V6: Rate limit on verify-email
  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body.token);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // V6: Rate limit on reset-password
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-verification')
  @UseGuards(AuthGuard('jwt'))
  async resendVerification(@Request() req) {
    return this.authService.resendVerification(req.user.userId);
  }

  @Post('verify-all-emails')
  @UseGuards(AuthGuard('jwt'), AdminGuard) // V11: Reusable AdminGuard instead of ad-hoc DB check
  async verifyAllEmails(@Request() req) {
    const result = await this.prisma.user.updateMany({
      where: { isEmailVerified: false },
      data: { isEmailVerified: true },
    });
    return { message: `${result.count} usuarios marcados como verificados` };
  }

  @SkipThrottle()
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req) {
    const user = await this.authService.getFullProfile(req.user.userId);
    return { user };
  }

  @Patch('change-name')
  @UseGuards(AuthGuard('jwt'))
  async changeName(@Request() req, @Body() dto: ChangeNameDto) {
    return this.authService.changeName(req.user.userId, dto.name || '');
  }

  @AuditLog({ action: 'auth.password_change', targetType: 'User', severity: 'warn' })
  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto, @Res({ passthrough: true }) res: Response) {
    await this.authService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
    // Revoga sessões em outros dispositivos — limpa cookies para forçar novo login
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('access_token', { httpOnly: true, secure: isProduction, sameSite: 'lax' as const });
    res.clearCookie('refresh_token', { httpOnly: true, secure: isProduction, sameSite: 'lax' as const });
    return { message: 'Senha alterada com sucesso' };
  }

  @Post('change-email')
  @UseGuards(AuthGuard('jwt'))
  async changeEmail(@Request() req, @Body() dto: ChangeEmailDto, @Res({ passthrough: true }) res: Response) {
    await this.authService.changeEmail(req.user.userId, dto.newEmail, dto.password);
    // Revoga sessões — limpa cookies para forçar novo login com novo email
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('access_token', { httpOnly: true, secure: isProduction, sameSite: 'lax' as const });
    res.clearCookie('refresh_token', { httpOnly: true, secure: isProduction, sameSite: 'lax' as const });
    return { message: 'E-mail alterado. Verifique seu novo endereço para confirmar.' };
  }

  @AuditLog({ action: 'user.delete_account', targetType: 'User', severity: 'critical' })
  @Delete('delete-account')
  @UseGuards(AuthGuard('jwt'))
  async deleteAccount(@Request() req, @Body() body: DeleteAccountDto) { // V13: Proper DTO
    return this.authService.deleteAccount(req.user.userId, body.password);
  }
}