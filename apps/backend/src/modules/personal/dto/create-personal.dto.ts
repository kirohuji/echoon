export class CreatePersonalDto {
  // user 字段
  phone: string;
  password?: string;
  emails?: string[];
  username?: string;

  // personal 字段
  prompt: string;
  llm?: any;
  tts?: any;
  stt?: any;
  photoURL?: string;
  description?: string;
} 