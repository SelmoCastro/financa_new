import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
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
import { RecurringTransactionsModule } from './recurring-transactions/recurring-transactions.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AutoTransactionScheduler } from './scheduler/auto-transaction.scheduler';

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
    PrismaModule,
    TransactionsModule,
    BudgetsModule,
    GoalsModule,
    AccountsModule,
    CategoriesModule,
    CreditCardsModule,
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
    ScheduleModule.forRoot(),
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
  ],
})
export class AppModule {}
