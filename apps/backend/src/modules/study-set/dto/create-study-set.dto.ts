import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStudySetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
