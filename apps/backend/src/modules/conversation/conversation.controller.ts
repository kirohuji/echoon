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

  // 创建会话并添加参与者
  @Post('create')
  async createConversationWithUser(@Body() body: { conversation: Conversation, users: { userId: string, isPersonal: boolean }[] }) {
    return this.conversationService.createConversationWithUser(body.conversation, body.users);
  }

  // 获取当前用户的所有会话
  @Get('my')
  async getMyConversations(@CurrentUser() user: User) {
    return this.conversationService.getConversationsByUserId(user.id);
  }

  // 根据会话id获取会话详情
  @Get(':id')
  async getConversationById(@Param('id') id: string) {
    return this.conversationService.getConversationById(id);
  }

  // 根据会话id分页获取消息记录
  @Post(':id/messages')
  async getMessagesByConversationId(
    @Param('id') id: string,
    @Body() body: { page: number, limit: number },
  ) {
    return this.conversationService.getMessagesByConversationId(id, body.page, body.limit);
  }

  // 创建默认个人会话
  @Post('personal/default/create')
  async createConversationWithDefaultPersonal(@CurrentUser() user: User) {
    return this.conversationService.createConversationWithDefaultPersonal(user);
  }
}