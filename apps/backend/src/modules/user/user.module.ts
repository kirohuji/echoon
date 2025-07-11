import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule.forRoot({ isGlobal: true }),
  ],
  controllers: [UserController],
  providers: [
    UserService,  
  ],
  exports: [UserService],
})
export class UserModule {}
