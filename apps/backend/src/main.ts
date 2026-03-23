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

  // RMQ is optional: set ENABLE_RMQ=false when you don't use RabbitMQ (e.g. only HTTP API + external DB).
  const enableRmq =
    process.env.ENABLE_RMQ !== 'false' && process.env.ENABLE_RMQ !== '0';

  if (enableRmq) {
    const rmqUrl = process.env.RMQ_URL ?? 'amqp://115.159.95.166:5672';
    const rmqQueue = process.env.RMQ_QUEUE ?? 'pipecat';
    const rmqRoutingKey = process.env.RMQ_ROUTING_KEY ?? rmqQueue;

    app.connectMicroservice<MicroserviceOptions>(
      {
        transport: Transport.RMQ,
        options: {
          urls: [rmqUrl],
          queue: rmqQueue,
          routingKey: rmqRoutingKey,
          queueOptions: {
            durable: true,
          },
        },
      },
    );
  }
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

  if (enableRmq) {
    await app.startAllMicroservices();
  }
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
