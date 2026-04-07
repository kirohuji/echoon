import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStudySetDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
