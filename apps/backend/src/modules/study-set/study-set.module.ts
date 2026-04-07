import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { StudyCardController } from './study-card.controller';
import { StudySetController } from './study-set.controller';
import { StudySetService } from './study-set.service';

@Module({
  imports: [PrismaModule.forRoot({ isGlobal: true })],
  controllers: [StudySetController, StudyCardController],
  providers: [StudySetService],
  exports: [StudySetService],
})
export class StudySetModule {}
