import { Module } from '@nestjs/common';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@Module({
  imports: [PrismaModule.forRoot({ isGlobal: true })],
  controllers: [AdminUserController],
  providers: [AdminUserService, RolesGuard],
})
export class AdminUserModule {}
