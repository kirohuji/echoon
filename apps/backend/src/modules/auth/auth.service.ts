import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { InvalidCredentialsException, InvalidTokenException, TokenExpiredException, UserNotFoundException, InvalidVerificationCodeException, UserAlreadyExistsException } from './exceptions';
import { User } from '@prisma/client';
import * as crypto from 'crypto';
import { REFRESH_TOKEN_CONFIG } from './constants';

interface JwtPayload {
  id: string;
  phone: string;
}
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 验证用户
   * @param phone 手机号
   * @param password 密码
   * @returns 用户
   */
  async validateUser(
    phone: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        phone,
      },
    });

    if (!user) {
      throw new UserNotFoundException();
    }

    if (user?.password) {
      const [salt, storedHash] = user.password.split(':');
      const hash = crypto
        .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
        .toString('hex');

      if (hash === storedHash) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user;
        return result;
      }
    }
    throw new InvalidCredentialsException();
  }

  /**
   * 生成 token
   * @param user 用户
   * @returns 
   */
  async generateTokens(user: Omit<User, 'password'>) {
    const payload = {
      id: user.id,
      phone: user.phone,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: REFRESH_TOKEN_CONFIG.secret,
      expiresIn: REFRESH_TOKEN_CONFIG.signOptions.expiresIn,
    });
    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userId: user.id,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  /**
   * 登录
   * @param user 用户
   * @returns 
   */
  async login(user: Omit<User, 'password'>) {
    return this.generateTokens(user);
  }

  /**
   * 刷新 token
   * @param refreshToken 刷新 token
   * @returns 
   */
  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: REFRESH_TOKEN_CONFIG.secret,
      });

      // Check if token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        throw new InvalidTokenException();
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new TokenExpiredException();
      }

      // Delete old refresh token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      // Generate new tokens
      const { user } = storedToken;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return this.generateTokens(userWithoutPassword);
    } catch (error) {
      if (error instanceof TokenExpiredException) {
        throw error;
      }
      throw new InvalidTokenException();
    }
  }

  /**
   * 退出登录
   * @param userId 用户 ID
   * @param refreshToken 刷新 token
   * @returns 
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    // 删除 refresh token
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          token: refreshToken,
          userId: userId,
        },
      });
    }
  }

  /**
   * 注册
   * @param phone 手机号
   * @param password 密码
   * @param username 用户名
   * @returns 
   */
  async register(phone: string, password: string, username?: string) {
    // 检查是否有未删除的用户
    const existingActiveUser = await this.prisma.user.findFirst({
      where: {
        phone,
      },
    });

    if (existingActiveUser) {
      throw new UserAlreadyExistsException();
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');

    // 创建新用户
    const newUser = await this.prisma.user.create({
      data: {
        phone,
        password: `${salt}:${hashedPassword}`,
        username,
      },
    });
    await this.prisma.profile.create({
      data: {
        id: newUser.id,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;
    // 注册成功后自动登录
    return this.login(userWithoutPassword);
  }

  /**
   * 更新用户密码
   * @param userId 用户 ID
   * @param newPassword 新密码
   * @returns 
   */
  async updateUserPassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundException();
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = crypto
      .pbkdf2Sync(newPassword, salt, 1000, 64, 'sha512')
      .toString('hex');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: `${salt}:${hashedPassword}`,
      },
    });

    return { message: 'Password updated successfully' };
  }

  /**
   * 更新用户资料
   * @param userId 用户 ID
   * @param data 用户资料
   * @returns 
   */
  async updateUserProfile(userId: string, data) {
    // 先检查用户是否存在
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new UserNotFoundException();
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    const profile = await this.prisma.profile.update({
      where: { id: userId },
      data,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return {
      user: result,
      profile,
    };
  }

  /**
   * 获取用户资料
   * @param userId 用户 ID
   * @returns 
   */
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundException();
    }
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });
    return {
      user,
      profile,
    };
  }

  /**
   * 删除用户
   * @param userId 用户 ID
   * @returns 
   */
  async removeUser(userId: string) {
    await this.prisma.user.delete({
      where: { id: userId },
    });
    await this.prisma.profile.delete({
      where: { id: userId },
    });
  }
}