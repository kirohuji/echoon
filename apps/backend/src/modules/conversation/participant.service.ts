
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Participant } from '@prisma/client';
import { CrudService } from '@/common/crud.service';

@Injectable()
export class ParticipantService extends CrudService<Participant> {
  constructor(prisma: PrismaService) {
    super(prisma, 'participant');
  }
}