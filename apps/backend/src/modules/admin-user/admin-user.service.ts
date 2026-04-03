import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { hashPassword } from 'better-auth/crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class AdminUserService {
  constructor(private readonly prisma: PrismaService) {}

  private legacyHash(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');
    return `${salt}:${hashedPassword}`;
  }

  private defaultEmailFromPhone(phone: string): string {
    return `${phone.replace(/\s+/g, '')}@phone.echoon.local`;
  }

  async list() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        image: true,
        phoneNumber: true,
        phoneNumberVerified: true,
        username: true,
        status: true,
        emails: true,
        lastOnline: true,
        createdAt: true,
        updatedAt: true,
        profile: { select: { name: true } },
        roleAssignments: {
          select: { role: { select: { value: true, label: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateAdminUserDto) {
    const exists = await this.prisma.user.findFirst({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (exists) {
      throw new ConflictException('该手机号已注册');
    }
    const email = dto.email ?? this.defaultEmailFromPhone(dto.phoneNumber);
    const emailTaken = await this.prisma.user.findUnique({
      where: { email },
    });
    if (emailTaken) {
      throw new ConflictException('该邮箱已被使用');
    }

    const legacy = this.legacyHash(dto.password);
    const baHash = await hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        phoneNumber: dto.phoneNumber,
        email,
        name: dto.username ?? dto.phoneNumber,
        username: dto.username,
        password: legacy,
        status: dto.status ?? 1,
        emails: [],
      },
    });

    await this.prisma.profile.create({
      data: {
        id: user.id,
        name: dto.username ?? undefined,
      },
    });

    await this.prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password: baHash,
      },
    });

    return this.findOneSafe(user.id);
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('用户不存在');
    }

    if (dto.phoneNumber && dto.phoneNumber !== existing.phoneNumber) {
      const taken = await this.prisma.user.findFirst({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (taken) {
        throw new ConflictException('该手机号已存在');
      }
    }

    if (dto.email && dto.email !== existing.email) {
      const taken = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (taken) {
        throw new ConflictException('该邮箱已存在');
      }
    }

    const {
      password,
      phoneNumber,
      email,
      username,
      name,
      status,
      emails,
    } = dto;

    const data: Record<string, unknown> = {};
    if (phoneNumber !== undefined) data.phoneNumber = phoneNumber;
    if (email !== undefined) data.email = email;
    if (username !== undefined) data.username = username;
    if (name !== undefined) data.name = name;
    if (status !== undefined) data.status = status;
    if (emails !== undefined) data.emails = emails;

    if (password) {
      data.password = this.legacyHash(password);
      const baHash = await hashPassword(password);
      const cred = await this.prisma.account.findFirst({
        where: { userId: id, providerId: 'credential' },
      });
      if (cred) {
        await this.prisma.account.update({
          where: { id: cred.id },
          data: { password: baHash },
        });
      } else {
        await this.prisma.account.create({
          data: {
            id: crypto.randomUUID(),
            userId: id,
            accountId: id,
            providerId: 'credential',
            password: baHash,
          },
        });
      }
    }

    await this.prisma.user.update({
      where: { id },
      data: data as any,
    });

    if (status === 0) {
      await this.prisma.session.deleteMany({ where: { userId: id } });
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    return this.findOneSafe(id);
  }

  async remove(id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('用户不存在');
    }
    await this.prisma.session.deleteMany({ where: { userId: id } });
    await this.prisma.account.deleteMany({ where: { userId: id } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    await this.prisma.user.update({
      where: { id },
      data: { status: 0 },
    });
    return { ok: true };
  }

  private async findOneSafe(id: string) {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        image: true,
        phoneNumber: true,
        phoneNumberVerified: true,
        username: true,
        status: true,
        emails: true,
        lastOnline: true,
        createdAt: true,
        updatedAt: true,
        profile: { select: { name: true } },
        roleAssignments: {
          select: { role: { select: { value: true, label: true } } },
        },
      },
    });
    if (!row) {
      throw new NotFoundException('用户不存在');
    }
    return row;
  }
}
