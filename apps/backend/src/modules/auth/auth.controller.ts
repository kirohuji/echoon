import { Body, Controller, Get, Patch, Post, Req, Res, UnauthorizedException, UseFilters, UseGuards } from '@nestjs/common';
import { AuthExceptionFilter, UserAlreadyExistsException, UserNotFoundException } from './exceptions';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  TokenResponseDto,
  MessageResponseDto,
  UpdatePasswordDto,
  UpdateProfileDto,
  ProfileResponseDto
} from './dto';
import { JWT_CONSTANTS, JWT_COOKIE_OPTIONS } from './constants';
import { CurrentUser } from '@/decorator/user.decorator';
import { User } from '@prisma/client';
import { Request, Response } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.authService.validateUser(loginDto.phone, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<TokenResponseDto> {
    try {
      return await this.authService.register(registerDto.phone, registerDto.password, registerDto.username);
    } catch (error) {
      if (error instanceof UserAlreadyExistsException) {
        throw error;
      }
      throw new UserAlreadyExistsException();
    }
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response, @CurrentUser() user: User): Promise<MessageResponseDto> {
    const refreshToken = (req.cookies as { [key: string]: string })[
      JWT_CONSTANTS.REFRESH_TOKEN_COOKIE
    ];
    await this.authService.logout(user.id, refreshToken);
    // 清除 refresh token cookie
    res.clearCookie(JWT_CONSTANTS.REFRESH_TOKEN_COOKIE, JWT_COOKIE_OPTIONS);
    return { message: '退出登录成功' };
  }

  @Post('update-password')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async updatePassword(@Body() updatePasswordDto: UpdatePasswordDto, @CurrentUser() user: User): Promise<MessageResponseDto> {
    try {
      await this.authService.updateUserPassword(user.id, updatePasswordDto.newPassword);
      return { message: '密码更新成功' };
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw error;
      }
      throw new UserNotFoundException();
    }
  }

  @Patch()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(@CurrentUser() user: User, @Body() updateProfileDto: UpdateProfileDto): Promise<MessageResponseDto> {
    try {
      const updatedUser = await this.authService.updateUserProfile(
        user.id,
        updateProfileDto,
      );
      return updatedUser as unknown as MessageResponseDto;
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw error;
      }
      throw new UserNotFoundException();
    }
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@CurrentUser() user: User): Promise<ProfileResponseDto> {
    try {
      const profile = await this.authService.getUserProfile(user.id);
      return profile as unknown as ProfileResponseDto;
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw error;
      }
      throw new UserNotFoundException();
    };
  }
}
