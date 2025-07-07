import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // 处理验证错误
    if (
      status === HttpStatus.BAD_REQUEST.valueOf() &&
      Array.isArray(exceptionResponse['message'])
    ) {
      const validationErrors = exceptionResponse['message'];
      const errorMessages = validationErrors.map((error) => {
        if (typeof error === 'string') {
          return error;
        }
        return Object.values(
          (error as { constraints?: Record<string, string> }).constraints || {},
        ).join(', ');
      });

      response.status(status).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errorMessages.join('; '),
          details: {
            path: request.url,
            timestamp: new Date().toISOString(),
          },
        },
      });
      return;
    }

    // 处理其他 HTTP 异常
    response.status(status).json({
      success: false,
      error: {
        code: `HTTP_${status}`,
        message: exception.message,
        details: {
          path: request.url,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }
}
