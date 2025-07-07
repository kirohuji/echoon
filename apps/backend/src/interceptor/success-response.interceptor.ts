import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@/common/response.interface';
import { Response, Request } from 'express';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
type JsonArray = JsonValue[];

@Injectable()
export class SuccessResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  private convertDatesToTimestamps(data: JsonValue): JsonValue {
    if (data === null || data === undefined) {
      return data;
    }

    if (data instanceof Date) {
      return data.getTime();
    }

    // Handle ISO date strings
    if (
      typeof data === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)
    ) {
      return new Date(data).getTime();
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.convertDatesToTimestamps(item));
    }

    if (typeof data === 'object') {
      const result: JsonObject = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          result[key] = this.convertDatesToTimestamps(data[key]);
        }
      }
      return result;
    }

    return data;
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();
    const method = request.method;

    // 根据请求方法设置状态码
    let statusCode = response.statusCode;
    if (statusCode === 200) {
      switch (method) {
        case 'POST':
        case 'PUT':
        case 'PATCH':
          statusCode = 200; // 更新成功
          break;
        case 'DELETE':
          statusCode = 204; // 删除成功
          break;
        case 'GET':
        default:
          statusCode = 200; // 获取成功
          break;
      }
    }

    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        code: `HTTP_${statusCode}`,
        data: this.convertDatesToTimestamps(
          data as unknown as JsonValue,
        ) as unknown as T,
      })),
    );
  }
}
