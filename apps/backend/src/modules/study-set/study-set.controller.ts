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
import { AddStudyCardsDto } from './dto/add-study-cards.dto';
import { CreateStudySetDto } from './dto/create-study-set.dto';
import { ReviewStudyCardDto } from './dto/review-study-card.dto';
import { UpdateStudySetDto } from './dto/update-study-set.dto';
import { StudySetService } from './study-set.service';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('study-set')
export class StudySetController {
  constructor(private readonly studySetService: StudySetService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.studySetService.listForUser(user.id);
  }

  @Post()
  create(@Body() dto: CreateStudySetDto, @CurrentUser() user: User) {
    return this.studySetService.create(dto, user);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.studySetService.getByIdForUser(id, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudySetDto,
    @CurrentUser() user: User,
  ) {
    return this.studySetService.updateSet(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.studySetService.deleteSet(id, user.id);
  }

  @Post(':id/cards')
  addCards(
    @Param('id') id: string,
    @Body() dto: AddStudyCardsDto,
    @CurrentUser() user: User,
  ) {
    return this.studySetService.addCards(id, user.id, dto);
  }

  @Post(':id/review')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewStudyCardDto,
    @CurrentUser() user: User,
  ) {
    return this.studySetService.review(id, user.id, dto);
  }
}
