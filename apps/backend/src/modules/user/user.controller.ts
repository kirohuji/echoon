import { Controller } from '@nestjs/common';
import { CrudController } from '@/common/crud.controller';
import { UserService } from './user.service';
import { User } from '@prisma/client';

@Controller('user')
export class UserController extends CrudController<User> {
  constructor(private readonly userService: UserService) {
    super(userService);
  }
  
}