import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { HomeService } from './home.service';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('portal')
  portal() {
    return this.homeService.getPortal();
  }
}

