import { Controller, UseGuards, Get, Post, Body, Param, Query, Request } from '@nestjs/common';
import { CrudController } from '@/common/crud.controller';
import { ConversationService } from './conversation.service';
import { Conversation } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@/decorator/user.decorator';
import { User } from '@prisma/client';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('conversation')
export class ConversationController extends CrudController<Conversation> {
  constructor(
    private readonly conversationService: ConversationService) {
    super(conversationService);
  }

  // 1. 创建会话并添加参与者
  @Post('create')
  async createConversationWithUser(@Body() body: { conversation: Conversation, userIds: string[] }) {
    return this.conversationService.createConversationWithUser(body.conversation, body.userIds);
  }

  // 2. 获取当前用户的所有会话
  @Get('my')
  async getMyConversations(@CurrentUser() user: User) {
    return this.conversationService.getConversationsByUserId(user.id);
  }

  // 3. 根据会话id获取会话详情
  @Get(':id')
  async getConversationById(@Param('id') id: string) {
    return this.conversationService.getConversationById(id);
  }

  // 4. 根据会话id分页获取消息记录
  @Get(':id/messages')
  async getMessagesByConversationId(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.conversationService.getMessagesByConversationId(id, page, pageSize);
  }
}