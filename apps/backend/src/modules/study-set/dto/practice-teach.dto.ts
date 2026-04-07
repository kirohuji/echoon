import { IsNotEmpty, IsString } from 'class-validator';

export class PracticeTeachDto {
  @IsString()
  @IsNotEmpty()
  cardId!: string;
}
