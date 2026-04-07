import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class StudyCardItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  term!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  definition!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
