import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateStudyCardDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  term?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  definition?: string;

  @IsOptional()
  @IsIn(['translation', 'qa'])
  cardType?: 'translation' | 'qa';

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
