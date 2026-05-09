import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_VERIFIED_EMAIL_KEY } from './require-verified-email.decorator';

/**
 * Guard de verificação de email.
 * 
 * Com SMTP configurado (Hostinger), novos usuários recebem email de verificação.
 * Usuários existentes com isEmailVerified=true continuam funcionando normalmente.
 * 
 * Para ATIVAR a verificação obrigatória (bloquear acesso Se email nao verificado):
 * Descomentar o bloco com ForbiddenException e remover o warning.
 * 
 * Por enquanto: loga warning mas permite acesso (soft mode).
 */
@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireVerified =
      this.reflector.getAllAndOverride<boolean>(
        REQUIRE_VERIFIED_EMAIL_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requireVerified) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Guard global roda ANTES do AuthGuard popular request.user.
    // Se user não existe ainda, permite e deixa o AuthGuard local lidar.
    if (!user) {
      return true;
    }

    // Se tem user mas email não verificado, bloqueia com 403
    if (user.isEmailVerified !== true) {
      throw new ForbiddenException('Email verification required');
    }

    return true;
  }
}