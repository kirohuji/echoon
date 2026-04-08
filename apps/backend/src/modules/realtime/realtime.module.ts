import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RealtimeGateway } from './realtime.gateway';
import { UserPushService } from './user-push.service';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [RealtimeGateway, UserPushService],
  exports: [UserPushService],
})
export class RealtimeModule {}
