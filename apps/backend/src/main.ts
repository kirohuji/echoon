import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SuccessResponseInterceptor } from '@/interceptor/success-response.interceptor';
import { HttpExceptionFilter } from '@/exception-handler/http-exception.filter';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://115.159.95.166:5672'],
        queue: 'pipecat',
        routingKey: 'pipecat',
        queueOptions: {
          durable: true,
        },
      },
    },
  );
  app.useBodyParser('json', { limit: '15mb' });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          return {
            field: error.property,
            message: Object.values(error.constraints || {}).join(', '),
          };
        });
        return {
          message: messages,
          error: 'Bad Request',
          statusCode: 400,
        };
      },
    }),
  );
  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
