import { AudioProvider } from '@prisma/client';
import { Allow, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SynthesizeSpeechDto {
  @IsString()
  @MinLength(1)
  @MaxLength(800)
  text!: string;

  @IsEnum(AudioProvider)
  audioProvider!: AudioProvider;

  @IsString()
  @MinLength(1)
  audioModel!: string;

  @IsOptional()
  @IsString()
  audioVoiceId?: string;

  @IsOptional()
  @Allow()
  params?: Record<string, unknown>;
}
