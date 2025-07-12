import { Controller, Body, Post, Delete, Param } from '@nestjs/common';
import { CrudController } from '@/common/crud.controller';
import { PersonalService } from './personal.service';
import { Personal } from '@prisma/client';
import { CreatePersonalDto } from './dto/create-personal.dto';
import * as fs from 'fs';
import * as path from 'path';

@Controller('personal')
export class PersonalController extends CrudController<Personal> {
  constructor(private readonly personalService: PersonalService) {
    super(personalService);
  }
  
  @Post('create')
  async createPersonal(@Body() dto: CreatePersonalDto) {
    return this.personalService.createPersonal(dto);
  }

  @Post('mock-ai-roles')
  async mockAiRoles() {
    // 预制的 AI 聊天角色列表
    return [
      {
        id: 'ai-1',
        name: 'Emma',
        avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
        description: '一位来自伦敦的英语老师，善于纠正发音和语法。',
        specialty: '日常英语、发音纠正',
        language: 'en',
        personality: '耐心、友好',
      },
      {
        id: 'ai-2',
        name: 'Jack',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        description: '美国加州的大学生，喜欢科技和运动。',
        specialty: '口语交流、俚语',
        language: 'en',
        personality: '活泼、幽默',
      },
      {
        id: 'ai-3',
        name: 'Sophia',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        description: '澳大利亚的旅行爱好者，喜欢分享旅行故事。',
        specialty: '旅游英语、文化交流',
        language: 'en',
        personality: '开朗、健谈',
      },
      {
        id: 'ai-4',
        name: 'Tom',
        avatar: 'https://randomuser.me/api/portraits/men/76.jpg',
        description: '英国的商务人士，擅长商务英语和面试技巧。',
        specialty: '商务英语、面试',
        language: 'en',
        personality: '专业、细致',
      },
    ];
  }

  @Post('mock-ai-roles-to-db')
  async mockAiRolesToDb() {
    const filePath = path.join(__dirname, 'mock-ai-roles.json');
    const roles = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return this.personalService.createMockAiRoles(roles);
  }

  @Delete(':id')
  async removePersonal(@Param('id') id: string) {
    return this.personalService.removePersonal(id);
  }
}