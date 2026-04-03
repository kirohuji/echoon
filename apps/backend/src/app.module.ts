import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import configurations from './configurations';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule as BetterAuthNestModule } from '@thallesp/nestjs-better-auth';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { PersonalModule } from './modules/personal/personal.module';
import { DocumentModule } from './modules/document/document.module';
import { TagModule } from './modules/tag/tag.module';
import { DocumentLibraryModule } from './modules/document-library/document-library.module';
import { AdminUserModule } from './modules/admin-user/admin-user.module';
import { auth } from './lib/better-auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configurations,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    BetterAuthNestModule.forRoot({
      auth,
      disableGlobalAuthGuard: true,
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    AdminUserModule,
    ConversationModule,
    PersonalModule,
    DocumentModule,
    TagModule,
    DocumentLibraryModule,
  ],
  controllers: [],
})
export class AppModule {}
