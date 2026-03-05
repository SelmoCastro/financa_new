
import { Controller, Post, Body, UseGuards, Request, Get, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

@Controller({
  path: 'auth',
  version: '1',
})
@Throttle({ default: { limit: 5, ttl: 60000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(@Body() req) {
    console.log('--- REQUISIÇÃO RECEBIDA DO MOBILE ---');
    console.log('Email:', req.email);
    console.log('Senha contém caracteres:', req.password ? req.password.length : 0);
    const user = await this.authService.validateUser(req.email, req.password);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.authService.login(user); // Returns { access_token: ... }
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
}
