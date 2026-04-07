import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '@/decorator/user.decorator';
import { NotificationService } from './notification.service';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('me')
  listMine(@CurrentUser() user: User) {
    return this.notificationService.listMine(user.id);
  }

  @Post('read')
  markRead(@CurrentUser() user: User, @Body() dto: { id: string }) {
    return this.notificationService.markRead(user.id, dto.id);
  }
}

