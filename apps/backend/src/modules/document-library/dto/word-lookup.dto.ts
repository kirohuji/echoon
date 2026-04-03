import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class WordLookupBatchDto {
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  candidates!: string[];
}
