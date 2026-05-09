import { Module } from '@nestjs/common';
import { AppVersionController } from './app-version.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppVersionController],
})
export class AppVersionModule {}