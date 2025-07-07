import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: '验证码' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '新密码' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 20)
  newPassword: string;
}
