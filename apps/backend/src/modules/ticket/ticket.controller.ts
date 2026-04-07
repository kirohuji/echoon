import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '@/decorator/user.decorator';
import { TicketService } from './ticket.service';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get('me')
  listMine(@CurrentUser() user: User) {
    return this.ticketService.listMine(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: { subject: string; content: string }) {
    return this.ticketService.create(user.id, dto);
  }
}

