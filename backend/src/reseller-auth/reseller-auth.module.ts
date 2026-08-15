/**
 * Módulo NestJS do domínio de autenticação de revendedores; agrupa controllers, services e dependências necessárias para este contexto.
 */
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ResellersModule } from '../resellers/resellers.module';
import { ResellerAuthController } from './reseller-auth.controller';
import { ResellerAuthService } from './reseller-auth.service';
import { ResellerJwtStrategy } from './reseller-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    AuditModule,
    ResellersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('RESELLER_JWT_SECRET') ||
          configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ResellerAuthController],
  providers: [ResellerAuthService, ResellerJwtStrategy],
  exports: [ResellerAuthService, ResellerJwtStrategy],
})
export class ResellerAuthModule {}
