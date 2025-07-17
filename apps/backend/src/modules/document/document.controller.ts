import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '@/common/crud.controller';
import { DocumentService } from './document.service';
import { Document } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('document')
export class DocumentController extends CrudController<Document> {
  constructor(private readonly documentService: DocumentService) {
    super(documentService);
  }
}