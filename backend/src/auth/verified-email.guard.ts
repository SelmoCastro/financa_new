import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_VERIFIED_EMAIL_KEY } from './require-verified-email.decorator';

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if the handler or class has the @RequireVerifiedEmail() decorator
    const requireVerified =
      this.reflector.getAllAndOverride<boolean>(
        REQUIRE_VERIFIED_EMAIL_KEY,
        [context.getHandler(), context.getClass()],
      );

    // If the endpoint doesn't require verified email, allow through
    if (!requireVerified) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.isEmailVerified !== true) {
      throw new ForbiddenException('Email verification required');
    }

    return true;
  }
}