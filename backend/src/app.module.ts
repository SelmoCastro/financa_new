/**
 * Módulo raiz do backend; registra os módulos de negócio, middlewares globais e integrações transversais.
 */
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { TransactionsModule } from './transactions/transactions.module';
import { BudgetsModule } from './budgets/budgets.module';
import { GoalsModule } from './goals/goals.module';
import { AccountsModule } from './accounts/accounts.module';
import { CategoriesModule } from './categories/categories.module';
import { CreditCardsModule } from './credit-cards/credit-cards.module';
import { CreditCardInvoiceModule } from './credit-card-invoices/credit-card-invoices.module';
import { FeedbackModule } from './feedback/feedback.module';

import { PrismaService } from './prisma/prisma.service';
import { AiModule } from './ai/ai.module';
import { ReportsModule } from './reports/reports.module';
import { EmailModule } from './email/email.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SocialModule } from './social/social.module';
import { VerifiedEmailGuard } from './auth/verified-email.guard';
import { AdminGuard } from './common/guards/admin.guard';
import { SubscriptionModule } from './subscription/subscription.module';
import { AuditModule } from './audit/audit.module';
import { AdminModule } from './admin/admin.module';
import { AppVersionModule } from './app-version/app-version.module';
import { ErrorsModule } from './errors/errors.module';
import { DecryptInterceptor } from './common/interceptors/decrypt.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { RecurringTransactionsModule } from './recurring-transactions/recurring-transactions.module';
import { PaymentsModule } from './payments/payments.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AutoTransactionScheduler } from './scheduler/auto-transaction.scheduler';
import { EncryptionModule } from './common/services/encryption.module';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module';
import { OcrModule } from './common/services/ocr.module';
import { BehavioralThrottleMiddleware } from './common/middleware/behavioral-throttle.middleware';
import { SecurityLoggerMiddleware } from './common/middleware/security-logger.middleware';
import { ResellersModule } from './resellers/resellers.module';
import { ResellerAuthModule } from './reseller-auth/reseller-auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    UsersModule,
    AuthModule,
    ResellersModule,
    ResellerAuthModule,

    PrismaModule,
    TransactionsModule,
    BudgetsModule,
    GoalsModule,
    AccountsModule,
    CategoriesModule,
    CreditCardsModule,
    CreditCardInvoiceModule,
    AiModule,
    ReportsModule,
    FeedbackModule,
    EmailModule,
    NotificationsModule,
    SocialModule,
    SubscriptionModule,
    AuditModule,
    AdminModule,
    AppVersionModule,
    ErrorsModule,
    RecurringTransactionsModule,
    PaymentsModule,
    EncryptionModule,
    ExchangeRateModule,
    OcrModule,
    ScheduleModule.forRoot(),
    CacheModule.register({
      ttl: 10000, // 10 segundos default
      max: 100, // máximo 100 entradas em cache
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    AdminGuard,
    AutoTransactionScheduler,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: VerifiedEmailGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DecryptInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityLoggerMiddleware, BehavioralThrottleMiddleware)
      .forRoutes('*');
  }
}
