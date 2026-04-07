import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PracticeEvaluateDto {
  @IsString()
  @IsNotEmpty()
  cardId!: string;

  @IsString()
  @MaxLength(2000)
  userAnswer!: string;
}
