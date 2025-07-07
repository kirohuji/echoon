import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@/common/response.interface';

export class AuthException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    code: string = 'AUTH_ERROR',
  ) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: `HTTP_${status}`,
        errorCode: code,
        message,
        details: {
          timestamp: new Date().toISOString(),
        },
      },
    };
    super(response, status);
  }
}
