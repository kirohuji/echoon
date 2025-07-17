
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Document } from '@prisma/client';
import { CrudService } from '@/common/crud.service';

@Injectable()
export class DocumentService extends CrudService<Document> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'document');
  }
}