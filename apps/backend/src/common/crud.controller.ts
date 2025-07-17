
import { Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CurrentUser } from '@/decorator/user.decorator';
import { User } from '@prisma/client';

export class CrudController<T> {
  constructor(protected readonly service: any) {}

  @Post()
  create(@Body() data: T, @CurrentUser() user: User) {
    return this.service.create(data, user);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() data: Partial<T>) {
    return this.service.update(Number(id), data);
  }
  
  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.service.remove(Number(id));
  }

  @Post('pagination')
  paginate(@Body() data: { page: number, limit: number, mine: boolean }, @CurrentUser() user: User) {
    return this.service.paginate(data.page, data.limit, data.mine, user);
  }

}