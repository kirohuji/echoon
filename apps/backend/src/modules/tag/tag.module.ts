import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';

@Module({
  imports: [PrismaModule.forRoot({ isGlobal: true })],
  controllers: [TagController],
  providers: [TagService],
  exports: [TagService],
})
export class TagModule {}
