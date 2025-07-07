import { DynamicModule, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaClient } from '@prisma/client';

@Module({})
export class PrismaModule {
  static forRoot(options: {
    isGlobal?: boolean;
    maxConnections?: number;
    logLevel?: 'info' | 'warn' | 'error';
  }): DynamicModule {
    return {
      module: PrismaModule,
      providers: [
        {
          provide: PrismaService,
          useFactory: () => {
            return new PrismaClient({
              log: options.logLevel ? [options.logLevel] : undefined,
              datasources: {
                db: {
                  url: process.env.DATABASE_URL,
                },
              },
            });
          },
        },
      ],
      exports: [PrismaService],
      global: options.isGlobal,
    };
  }
}
