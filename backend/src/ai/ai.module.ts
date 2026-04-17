import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ReportsModule } from '../reports/reports.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [ReportsModule, SubscriptionModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
