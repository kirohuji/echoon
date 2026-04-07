import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class ReviewStudyCardDto {
  @IsString()
  @IsNotEmpty()
  cardId!: string;

  @IsBoolean()
  correct!: boolean;
}
