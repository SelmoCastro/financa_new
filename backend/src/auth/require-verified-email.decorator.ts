/**
 * Arquivo de suporte do domínio de autenticação; dá sustentação ao fluxo principal deste módulo.
 */
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_VERIFIED_EMAIL_KEY = 'requireVerifiedEmail';
export const RequireVerifiedEmail = () =>
  SetMetadata(REQUIRE_VERIFIED_EMAIL_KEY, true);
