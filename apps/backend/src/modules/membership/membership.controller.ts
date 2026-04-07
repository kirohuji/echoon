import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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

  @Get('admin/all')
  listAll() {
    return this.membershipService.listAll();
  }

  @Post('admin/upsert')
  upsert(@Body() dto: { userId: string; plan?: string; status?: string; expiresAt?: string | null; benefits?: string[] }) {
    return this.membershipService.updateByUserId(dto.userId, dto);
  }
}

