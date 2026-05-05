import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Allow requests without JWT token (returns null user)
  handleRequest(err: any, user: any) {
    return user || null;
  }
}