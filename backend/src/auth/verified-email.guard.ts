import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_VERIFIED_EMAIL_KEY } from './require-verified-email.decorator';

/**
 * Guard de verificação de email.
 *
 * TEMPORARIAMENTE DESATIVADO — enquanto não temos domínio verificado na Resend,
 * o onboarding@resend.dev só envia para o dono da conta, então outros
 * usuários nunca conseguem verificar email.
 *
 * TODO: Reativar quando domínio for verificado na Resend (https://resend.com/domains).
 * Para reativar, basta remover o early return no canActivate().
 */
@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // TEMPORARIAMENTE DESATIVADO — sempre permite acesso
    // Descomentar o bloco abaixo quando domínio Resend for verificado:
    //
    // const requireVerified =
    //   this.reflector.getAllAndOverride<boolean>(
    //     REQUIRE_VERIFIED_EMAIL_KEY,
    //     [context.getHandler(), context.getClass()],
    //   );
    //
    // if (!requireVerified) {
    //   return true;
    // }
    //
    // const request = context.switchToHttp().getRequest();
    // const user = request.user;
    //
    // if (!user || user.isEmailVerified !== true) {
    //   throw new ForbiddenException('Email verification required');
    // }

    return true;
  }
}