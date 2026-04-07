import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '@/decorator/user.decorator';
import { MembershipService } from './membership.service';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.membershipService.getMyMembership(user.id);
  }
}

