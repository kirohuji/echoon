import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({ description: '新密码' })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  newPassword: string;
}

export class UpdateProfileDto {
  @ApiProperty({ description: '用户名', required: false })
  @IsString({ message: '用户名必须是字符串' })
  @IsOptional()
  name?: string;
}
