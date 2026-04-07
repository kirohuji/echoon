import { Body, Controller, Delete, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '@/decorator/user.decorator';
import { UpdateStudyCardDto } from './dto/update-study-card.dto';
import { StudySetService } from './study-set.service';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('study-card')
export class StudyCardController {
  constructor(private readonly studySetService: StudySetService) {}

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudyCardDto,
    @CurrentUser() user: User,
  ) {
    return this.studySetService.updateCard(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.studySetService.deleteCard(id, user.id);
  }
}
