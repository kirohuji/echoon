import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

@Module({
  imports: [PrismaModule],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}

