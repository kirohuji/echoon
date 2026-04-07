import { Body, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '@/decorator/user.decorator';
import { NotificationService } from './notification.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'notifications');

  @Get('me')
  listMine(@CurrentUser() user: User) {
    return this.notificationService.listMine(user.id);
  }

  @Post('read')
  markRead(@CurrentUser() user: User, @Body() dto: { id: string }) {
    return this.notificationService.markRead(user.id, dto.id);
  }

  @Get('admin/all')
  listAll() {
    return this.notificationService.listAll();
  }

  @Post('admin/create')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 1024 * 1024 * 10 },
    }),
  )
  async create(
    @Body() dto: { userId?: string; title: string; body: string; type?: string },
    @UploadedFile() image?: Express.Multer.File,
  ) {
    let imageUrl: string | null = null;
    if (image) {
      await fs.mkdir(this.uploadDir, { recursive: true });
      const safeName = `${Date.now()}-${image.originalname.replace(/\s+/g, '-')}`;
      const fullPath = path.join(this.uploadDir, safeName);
      await fs.writeFile(fullPath, image.buffer);
      imageUrl = fullPath;
    }
    return this.notificationService.createForUser({
      userId: dto.userId,
      title: dto.title,
      body: dto.body,
      type: dto.type,
      imageUrl,
    });
  }
}

