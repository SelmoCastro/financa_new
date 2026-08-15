/**
 * Interceptor compartilhado do backend; transforma ou enriquece a resposta/requisição de forma transversal.
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { serializeDecimal } from '../utils/serialize-decimal.util';

export interface Response<T> {
  statusCode: number;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data: T) => ({
        statusCode: response.statusCode,
        data: serializeDecimal(data),
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
