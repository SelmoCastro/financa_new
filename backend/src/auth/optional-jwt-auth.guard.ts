import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false,
  ): TUser | null {
    // If authentication fails, return null instead of throwing
    // This allows the endpoint to work for both authenticated and unauthenticated users
    if (err || !user) {
      return null;
    }
    return user;
  }
}
