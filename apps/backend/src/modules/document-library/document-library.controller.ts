import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { User } from '@prisma/client';
import { CurrentUser } from '@/decorator/user.decorator';
import type { Response } from 'express';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { DocumentLibraryService } from './document-library.service';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('document-library')
export class DocumentLibraryController {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'documents');

  constructor(private readonly documentLibraryService: DocumentLibraryService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 1024 * 1024 * 100 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title?: string; modelName: string; tagIds?: string | string[] },
    @CurrentUser() user: User,
  ) {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    const filePath = path.join(this.uploadDir, safeName);
    await fs.writeFile(filePath, file.buffer);

    const tagIds = Array.isArray(body.tagIds)
      ? body.tagIds
      : typeof body.tagIds === 'string' && body.tagIds.length > 0
        ? JSON.parse(body.tagIds)
        : [];

    return this.documentLibraryService.create(
      {
        title: body.title?.trim() || file.originalname,
        fileName: file.originalname,
        fileType: path.extname(file.originalname).replace('.', '').toLowerCase(),
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath,
        modelName: body.modelName || 'gpt-4o-mini',
        tagIds,
      },
      user,
    );
  }

  @Get()
  findAll() {
    return this.documentLibraryService.findAll();
  }

  @Post('pagination')
  paginate(@Body() data: { page: number; limit: number; keyword?: string; tagId?: string }) {
    return this.documentLibraryService.paginate(data);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentLibraryService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: { title?: string; modelName?: string; tagIds?: string[] },
    @CurrentUser() user: User,
  ) {
    return this.documentLibraryService.update(id, data, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentLibraryService.remove(id);
  }

  @Post(':id/generate-audio')
  generateAudio(@Param('id') id: string, @CurrentUser() user: User) {
    return this.documentLibraryService.generateAudio(id, user);
  }

  @Get(':id/audio')
  async getAudio(@Param('id') id: string, @Res() res: Response) {
    const record = await this.documentLibraryService.findOne(id);
    if (!record.audioPath) {
      return res.status(404).send('Audio not found');
    }
    return res.sendFile(record.audioPath);
  }
}
