import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class LearnFeedbackDto {
  @IsString()
  @IsNotEmpty()
  cardId!: string;

  @IsIn(['known', 'vague', 'unknown'])
  level!: 'known' | 'vague' | 'unknown';
}
