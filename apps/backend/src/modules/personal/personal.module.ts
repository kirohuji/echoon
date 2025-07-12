import { Module } from '@nestjs/common';
import { PersonalService } from './personal.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { PersonalController } from './personal.controller';

@Module({
  imports: [
    PrismaModule.forRoot({ isGlobal: true }),
  ],
  controllers: [PersonalController],
  providers: [
    PersonalService,  
  ],
  exports: [PersonalService],
})
export class PersonalModule {}
