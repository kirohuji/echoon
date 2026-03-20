import {
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CrudController } from '@/common/crud.controller';
import { DocumentService } from './document.service';
import { Document } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('document')
export class DocumentController extends CrudController<Document> {
  constructor(private readonly documentService: DocumentService) {
    super(documentService);
  }

  @Get(':id/audio')
  async getAudio(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const doc = await this.documentService.findOne(id);

    if (!doc?.fileUrl) {
      throw new NotFoundException('Document fileUrl not found');
    }

    // Pipecat audio download endpoint (same as previous frontend proxy target).
    // Prefer env var so prod can point to another host.
    const pipecatBaseUrl =
      process.env.PIPECAT_BASE_URL ?? 'http://115.159.95.166:7860';

    const upstreamUrl = `${pipecatBaseUrl}/bot/download?filename=${encodeURIComponent(doc.fileUrl)}`;

    const upstreamRes = await fetch(upstreamUrl);
    if (!upstreamRes.ok) {
      throw new InternalServerErrorException(
        `Failed to fetch audio from upstream (${upstreamRes.status})`,
      );
    }

    const contentType = upstreamRes.headers.get('content-type') ?? 'audio/mpeg';
    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.byteLength);
    res.status(200).send(buffer);
  }
}