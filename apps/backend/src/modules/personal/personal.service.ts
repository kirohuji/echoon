
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Personal } from '@prisma/client';
import { CrudService } from '@/common/crud.service';
import { CreatePersonalDto } from './dto/create-personal.dto';

@Injectable()
export class PersonalService extends CrudService<Personal> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'personal');
  }

  // 创建 personal 和 user
  async createPersonal(createPersonalDto: CreatePersonalDto): Promise<Personal> {
    // 先创建 user
    const user = await this.prisma.user.create({
      data: {
        phone: createPersonalDto.phone,
        password: createPersonalDto.password,
        emails: createPersonalDto.emails || [],
        username: createPersonalDto.username,
      },
    });
    // 再创建 personal，id 与 user 一致
    const personal = await this.prisma.personal.create({
      data: {
        id: user.id,
        prompt: createPersonalDto.prompt,
        llm: createPersonalDto.llm,
        tts: createPersonalDto.tts,
        stt: createPersonalDto.stt,
        photoURL: createPersonalDto.photoURL,
        description: createPersonalDto.description,
        // user: { connect: { id: user.id } }, // 移除
      },
    });
    return personal;
  }

  // 删除 personal 和 user
  async removePersonal(id: string): Promise<Personal> {
    // 先删除 personal
    const personal = await this.prisma.personal.delete({ where: { id } });
    // 再删除 user
    await this.prisma.user.delete({ where: { id } });
    return personal;
  }

  // 批量创建 AI 角色
  async createMockAiRoles(roles: any[]): Promise<Personal[]> {
    const created: Personal[] = [];
    for (const role of roles) {
      // 先创建 user
      const user = await this.prisma.user.create({
        data: {
          phone: role.id + '@ai.mock',
          password: 'mocked',
          emails: [],
          username: role.name,
        },
      });
      // 再创建 personal
      const personal = await this.prisma.personal.create({
        data: {
          id: user.id,
          prompt: role.prompt,
          llm: {},
          tts: {},
          stt: {},
          photoURL: role.photoURL,
          description: role.description,
        },
      });
      created.push(personal);
    }
    return created;
  }
}