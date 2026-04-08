import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SuccessResponseInterceptor } from '@/interceptor/success-response.interceptor';
import { HttpExceptionFilter } from '@/exception-handler/http-exception.filter';
import { SocketIoAdapter } from '@/modules/realtime/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const frontendOrigins = (
    process.env.FRONTEND_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const clientAppOrigins = (
    process.env.CLIENT_APP_ORIGINS ??
    'http://localhost:8081,http://127.0.0.1:8081'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const isProd = process.env.NODE_ENV === 'production';

  const socketIoOrigins = [...new Set([...frontendOrigins, ...clientAppOrigins])];
  app.useWebSocketAdapter(
    new SocketIoAdapter(
      app,
      isProd
        ? socketIoOrigins.length > 0
          ? { origin: socketIoOrigins, credentials: true }
          : { origin: true, credentials: true }
        : { origin: true, credentials: true },
    ),
  );

  app.enableCors({
    // 预检 OPTIONS 必须在 methods 内，否则会缺省 CORS 头导致浏览器报「Network Error」
    origin: isProd
      ? frontendOrigins.length > 0
        ? frontendOrigins
        : true
      : true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cookie'],
    credentials: true,
  });

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

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
