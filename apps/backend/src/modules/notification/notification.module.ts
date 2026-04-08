import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}

