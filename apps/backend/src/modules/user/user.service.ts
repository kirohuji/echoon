
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { User } from '@prisma/client';
import { CrudService } from '@/common/crud.service';

@Injectable()
export class UserService extends CrudService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user');
  }
}