import { ApiProperty } from '@nestjs/swagger';

export class RoleDto {
  @ApiProperty({ description: '角色ID' })
  id: string;

  @ApiProperty({ description: '角色名称' })
  name: string;

  @ApiProperty({ description: '角色描述', required: false })
  description: string | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class ProfileResponseDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '手机号' })
  phone: string;

  @ApiProperty({ description: '用户名', required: false })
  name: string | null;

  @ApiProperty({ description: '头像', required: false })
  avatar: string | null;

  @ApiProperty({ description: '状态' })
  status: number;

  @ApiProperty({ description: '最后登录时间', required: false })
  lastLoginAt: Date | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({ description: '用户角色', type: [RoleDto] })
  roles: RoleDto[];
}

export class TokenResponseDto {
  @ApiProperty({ description: '访问令牌' })
  access_token: string;

  @ApiProperty({ description: '刷新令牌' })
  refresh_token: string;

  @ApiProperty({ description: '用户信息' })
  user: ProfileResponseDto;
}

export class MessageResponseDto {
  @ApiProperty({ description: '响应消息' })
  message: string;
}

export class VerificationResponseDto {
  @ApiProperty({ description: '手机号' })
  phone: string;

  @ApiProperty({ description: '验证码（仅用于测试环境）' })
  verificationCode?: string;
}
