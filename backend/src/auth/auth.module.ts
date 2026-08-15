/**
 * Módulo NestJS do domínio de autenticação; agrupa controllers, services e dependências necessárias para este contexto.
 */
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { VerifiedEmailGuard } from './verified-email.guard';
import { AdminGuard } from '../common/guards/admin.guard'; // V11
import { RefreshTokenService } from './refresh-token.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    PrismaModule,
    EmailModule,
    AuditModule,
    SubscriptionModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    VerifiedEmailGuard,
    AdminGuard,
    RefreshTokenService,
  ], // V11
  exports: [AuthService, VerifiedEmailGuard, AdminGuard, RefreshTokenService], // V11 + RefreshTokenService Pilar 1
})
export class AuthModule {}
