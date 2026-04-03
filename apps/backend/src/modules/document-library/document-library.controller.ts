import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { AudioProvider, User } from '@prisma/client';
import { CurrentUser } from '@/decorator/user.decorator';
import type { Response } from 'express';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { DocumentLibraryService } from './document-library.service';
import { DocumentAudioRegenerateOverrides } from './document-audio.types';
import { WordLookupBatchDto } from './dto/word-lookup.dto';

type AudioConfigBody = {
  audioProvider?: AudioProvider;
  audioModel?: string;
  audioVoiceId?: string;
  modelName?: string;
};

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
    @Body() body: { title?: string; tagIds?: string | string[] } & AudioConfigBody,
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

    const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
    const isPlainTextUpload =
      ext === 'txt' ||
      ext === 'md' ||
      (typeof file.mimetype === 'string' && file.mimetype.startsWith('text/'));
    const extractedTextFromFile = isPlainTextUpload ? file.buffer.toString('utf8') : undefined;

    return this.documentLibraryService.create(
      {
        title: body.title?.trim() || file.originalname,
        fileName: file.originalname,
        fileType: ext,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath,
        extractedText: extractedTextFromFile,
        provider: body.audioProvider,
        model: body.audioModel,
        voiceId: body.audioVoiceId,
        legacyModelName: body.modelName,
        tagIds,
      },
      user,
    );
  }

  @Post('transcribe-video')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 1024 * 1024 * 500 },
    }),
  )
  async transcribeVideo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('请上传视频文件');
    }
    const isVideoMime = typeof file.mimetype === 'string' && file.mimetype.startsWith('video/');
    const isVideoExt = /\.(mp4|mov|mkv|avi|webm|m4v)$/i.test(file.originalname);
    if (!isVideoMime && !isVideoExt) {
      throw new BadRequestException('仅支持视频文件上传');
    }

    const videoUploadDir = path.join(this.uploadDir, 'videos');
    await fs.mkdir(videoUploadDir, { recursive: true });
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    const videoPath = path.join(videoUploadDir, safeName);
    await fs.writeFile(videoPath, file.buffer);

    const result = await this.documentLibraryService.transcribeVideoToWordTimestamps(videoPath);
    return {
      success: true,
      fileName: file.originalname,
      videoPath,
      audioPath: result.audioPath,
      analysisSnapshotPath: result.analysisSnapshotPath,
      wordCount: result.wordTimestamps.length,
      wordTimestamps: result.wordTimestamps,
      requestedBy: user.id,
    };
  }

  @Post('create-text')
  async createText(
    @Body()
    body: {
      title?: string;
      text: string;
      tagIds?: string | string[];
    } & AudioConfigBody,
    @CurrentUser() user: User,
  ) {
    const text = body.text?.toString() ?? '';
    if (!text.trim()) {
      // 这里不引入额外 HttpExceptionFilter，直接抛错会被全局异常过滤器包装
      throw new BadRequestException('text is empty');
    }

    await fs.mkdir(this.uploadDir, { recursive: true });

    const safeName = `${Date.now()}-custom-text.txt`;
    const filePath = path.join(this.uploadDir, safeName);
    await fs.writeFile(filePath, text);

    const tagIds = Array.isArray(body.tagIds)
      ? body.tagIds
      : typeof body.tagIds === 'string' && body.tagIds.length > 0
        ? JSON.parse(body.tagIds)
        : [];

    const fileName = body.title?.trim() || safeName;
    const fileSize = Buffer.byteLength(text, 'utf8');

    return this.documentLibraryService.create(
      {
        title: body.title?.trim() || fileName,
        fileName,
        fileType: 'txt',
        mimeType: 'text/plain',
        fileSize,
        filePath,
        extractedText: text,
        provider: body.audioProvider,
        model: body.audioModel,
        voiceId: body.audioVoiceId,
        legacyModelName: body.modelName,
        tagIds,
      },
      user,
    );
  }

  @Get()
  findAll() {
    return this.documentLibraryService.findAll();
  }

  @Get('audio-params-schema')
  getAudioParamsSchema() {
    return this.documentLibraryService.getAudioParamsSchema();
  }

  @Post('word-lookup')
  @HttpCode(HttpStatus.OK)
  wordLookupBatch(@Body() body: WordLookupBatchDto) {
    return this.documentLibraryService.lookupEnglishWordFirstMatch(body.candidates);
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
    @Body() data: { title?: string; tagIds?: string[] } & AudioConfigBody,
    @CurrentUser() user: User,
  ) {
    return this.documentLibraryService.update(id, data, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentLibraryService.remove(id);
  }

  @Post(':id/generate-audio')
  async generateAudio(@Param('id') id: string, @CurrentUser() user: User) {
    const target = await this.documentLibraryService.findOne(id);
    this.documentLibraryService.assertTtsConfigForGeneration(target);
    // 先立即返回“开始生成”的记录，前端即可轮询进度。
    const record = await this.documentLibraryService.startGenerateAudio(id, user);
    // 后台异步执行：解析PDF -> TTS -> 写入音频文件。
    void this.documentLibraryService.generateAudioPipeline(id, user);
    return record;
  }

  @Post(':id/generate-audio-text')
  async generateAudioFromText(
    @Param('id') id: string,
    @Body() body: { text: string } & DocumentAudioRegenerateOverrides,
    @CurrentUser() user: User,
  ) {
    const text = body?.text?.toString?.() ?? '';
    if (!text.trim()) {
      throw new BadRequestException('提取文本为空，无法生成音频');
    }

    const target = await this.documentLibraryService.findOne(id);
    const overrides: DocumentAudioRegenerateOverrides = {
      audioProvider: body.audioProvider,
      audioModel: body.audioModel,
      audioVoiceId: body.audioVoiceId,
      params: body.params,
    };
    this.documentLibraryService.assertTtsConfigForGeneration(target, overrides);
    const record = await this.documentLibraryService.startGenerateAudioFromText(id, text, user);
    void this.documentLibraryService.generateAudioTextPipeline(id, text, overrides, user);
    return record;
  }

  @Post(':id/generate-translation')
  generateTranslation(@Param('id') id: string, @CurrentUser() user: User) {
    return this.documentLibraryService.generateSentenceTranslation(id, user);
  }

  @Get(':id/audio')
  async getAudio(@Param('id') id: string, @Res() res: Response) {
    const record = await this.documentLibraryService.findOne(id);
    if (!record.audioPath) {
      return res.status(404).send('Audio not found');
    }
    return res.sendFile(record.audioPath);
  }

  @Get(':id/video')
  async getVideo(@Param('id') id: string, @Res() res: Response) {
    const record = await this.documentLibraryService.findOne(id);
    if (!record.filePath || !record.mimeType?.startsWith('video/')) {
      return res.status(404).send('Video not found');
    }
    return res.sendFile(record.filePath);
  }

  @Post(':id/transcribe-video')
  async transcribeExistingVideo(
    @Param('id') id: string,
    @Body() body: { whisperTemperature?: number | string; whisperSplitOnWord?: boolean | string },
    @CurrentUser() user: User
  ) {
    const raw = body?.whisperTemperature;
    const whisperTemperature =
      raw === undefined || raw === null || raw === ''
        ? undefined
        : Number.isFinite(Number(raw))
          ? Number(raw)
          : undefined;
    const rawSplitOnWord = body?.whisperSplitOnWord;
    const whisperSplitOnWord =
      typeof rawSplitOnWord === 'boolean'
        ? rawSplitOnWord
        : typeof rawSplitOnWord === 'string'
          ? rawSplitOnWord.trim().toLowerCase() === 'true'
          : undefined;
    return this.documentLibraryService.transcribeVideoDocument(id, user, {
      whisperTemperature,
      whisperSplitOnWord,
    });
  }
}
