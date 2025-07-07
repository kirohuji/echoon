import { Body, Controller, Post, UseFilters } from '@nestjs/common';
import { AuthExceptionFilter } from './exceptions';
import { AuthService } from './auth.service';
import {
  LoginDto,
  TokenResponseDto
} from './dto';

@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(loginDto);
  }
}
