
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Document, User } from '@prisma/client';
import { CrudService } from '@/common/crud.service';

@Injectable()
export class DocumentService extends CrudService<Document> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'document');
  }

  // 重写 create 方法，确保 Profile 存在
  async create(data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>, user?: User) {
    // 确保对应的 Profile 记录存在
    await this.ensureProfileExists(data.userId);
    
    // 调用父类的 create 方法
    return super.create(data, user);
  }

  // 确保 Profile 存在的辅助方法
  private async ensureProfileExists(userId: string) {
    // 检查 Profile 是否存在
    const existingProfile = await this.prisma.profile.findUnique({
      where: { id: userId }
    });

    if (!existingProfile) {
      // 检查 User 是否存在
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!existingUser) {
        throw new Error(`用户 ID ${userId} 不存在`);
      }

      // 创建 Profile 记录
      await this.prisma.profile.create({
        data: {
          id: userId,
          name: existingUser.username || undefined,
        }
      });
    }
  }
}