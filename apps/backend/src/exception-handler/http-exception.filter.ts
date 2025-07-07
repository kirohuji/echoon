import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiResponse } from '@/common/response.interface';

interface ValidationError {
  message: string;
  constraints?: Record<string, string>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage = 'Internal server error';
    let errorCode = 'HTTP_ERROR';
    if (exception instanceof HttpException) {
      errorMessage = exception.message;
    } else if (
      exception &&
      typeof exception === 'object' &&
      'message' in exception
    ) {
      const messages = exception.message;
      if (Array.isArray(messages)) {
        errorMessage = messages
          .map((msg: string | ValidationError): string =>
            typeof msg === 'object' ? msg.message : msg,
          )
          .join('; ');
        errorCode = 'ValidationError';
      } else {
        errorMessage = messages as string;
      }
    }

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code: `HTTP_${status}`,
        message: errorMessage,
        errorCode,
        details: {
          path: request.url,
          timestamp: new Date().toISOString(),
        },
      },
    };

    response.status(status).json(errorResponse);
  }
}
