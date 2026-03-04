
import { Controller, Post, Body, UseGuards, Request, Get, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

@Controller({
  path: 'auth',
  version: '1',
})
@Throttle({ default: { limit: 10, ttl: 60000 } })
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
    // In a real app we'd use a LocalGuard, but for simplicity we'll validate here or rely on service
    // Ideally: @UseGuards(LocalAuthGuard) -> req.user
    // For now, let's assume body has email/password and we validate manually if not using LocalStrategy
    // But better to use the service validation:
    const user = await this.authService.validateUser(req.email, req.password);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.authService.login(user); // Returns { access_token: ... }
  }
}
