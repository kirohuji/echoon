import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { StudyCardItemDto } from './study-card-item.dto';

export class AddStudyCardsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StudyCardItemDto)
  items!: StudyCardItemDto[];
}
