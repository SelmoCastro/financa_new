import { Module, forwardRef } from '@nestjs/common';
import { AiService } from './ai.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { AiController } from './ai.controller';

@Module({
  imports: [forwardRef(() => TransactionsModule)],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService]
})
export class AiModule { }
