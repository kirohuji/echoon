import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import configurations from './configurations';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { PersonalModule } from './modules/personal/personal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configurations,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UserModule,
    ConversationModule,
    PersonalModule,
  ],
  controllers: [],
})
export class AppModule {}
