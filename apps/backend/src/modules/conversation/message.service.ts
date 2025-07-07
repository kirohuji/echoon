
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Message } from '@prisma/client';
import { CrudService } from '@/common/crud.service';

@Injectable()
export class MessageService extends CrudService<Message> {
  constructor(prisma: PrismaService) {
    super(prisma, 'message');
  }
}