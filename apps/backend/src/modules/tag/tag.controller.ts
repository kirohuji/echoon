import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '@/decorator/user.decorator';
import { TagService } from './tag.service';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tag')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  create(@Body() data: { name: string; description?: string }, @CurrentUser() user: User) {
    return this.tagService.create(data, user);
  }

  @Get()
  findAll() {
    return this.tagService.findAll();
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string },
    @CurrentUser() user: User,
  ) {
    return this.tagService.update(id, data, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tagService.remove(id);
  }

  @Post('pagination')
  paginate(@Body() data: { page: number; limit: number; keyword?: string }) {
    return this.tagService.paginate(data.page, data.limit, data.keyword ?? '');
  }
}
