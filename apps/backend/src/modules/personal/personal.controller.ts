import { Controller, Body, Post, Delete, Param } from '@nestjs/common';
import { CrudController } from '@/common/crud.controller';
import { PersonalService } from './personal.service';
import { Personal } from '@prisma/client';
import { CreatePersonalDto } from './dto/create-personal.dto';

@Controller('personal')
export class PersonalController extends CrudController<Personal> {
  constructor(private readonly personalService: PersonalService) {
    super(personalService);
  }
  
  @Post('create')
  async createPersonal(@Body() dto: CreatePersonalDto) {
    return this.personalService.createPersonal(dto);
  }

  @Post('ai')
  async mockAiRolesToDb(@Body() roles: any[]) {
    return this.personalService.createMockAiRoles(roles);
  }

  @Delete(':id')
  async removePersonal(@Param('id') id: string) {
    return this.personalService.removePersonal(id);
  }
}