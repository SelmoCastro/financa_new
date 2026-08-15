/**
 * Filtro global de exceções; padroniza a forma como erros HTTP e falhas inesperadas são devolvidos ao cliente.
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  private sanitizeText(value: string) {
    return value
      .replace(
        /([?&](?:token|refreshToken|access_token|password|email)=)[^&]*/gi,
        '$1[REDACTED]',
      )
      .replace(/bearer\s+[a-z0-9._-]+/gi, 'Bearer [REDACTED]');
  }

  private sanitizeUnknown(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.sanitizeText(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeUnknown(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(
          ([key, entryValue]) => {
            if (/(token|password|authorization|cookie|email)/i.test(key)) {
              return [key, '[REDACTED]'];
            }
            return [key, this.sanitizeUnknown(entryValue)];
          },
        ),
      );
    }

    return value;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawExceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal Server Error' };

    const exceptionResponse = this.sanitizeUnknown(rawExceptionResponse);
    const isProduction = process.env.NODE_ENV === 'production';
    const safePath = this.sanitizeText(request.url);

    if (exception instanceof HttpException && status >= 400 && status < 500) {
      this.logger.warn(
        `HTTP ${status} ${request.method} ${safePath}: ${JSON.stringify(exceptionResponse)}`,
      );
    }

    let errorBody: Record<string, unknown>;
    if (typeof exceptionResponse === 'string') {
      const sanitized = exceptionResponse.replace(
        /^Expected .+ in JSON at position \d+$/,
        'Invalid request body',
      );
      errorBody = { message: sanitized };
    } else if (isProduction && status >= 500) {
      errorBody = { message: 'Internal Server Error' };
    } else if (isProduction) {
      const resp = exceptionResponse as Record<string, unknown>;
      // Suppress verbose validation errors in production (class-validator arrays)
      const msg = resp.message;
      if (Array.isArray(msg)) {
        errorBody = { message: 'Invalid request data' };
      } else if (
        typeof msg === 'string' &&
        (msg.length > 120 ||
          msg.includes('Unexpected token') ||
          msg.includes('is not valid JSON'))
      ) {
        // Truncate overly verbose messages (e.g. JSON parse errors, long stack traces)
        errorBody = { message: 'Invalid request' };
      } else {
        errorBody = { message: msg || 'An error occurred' };
      }
    } else {
      errorBody =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as Record<string, unknown>)
          : { message: String(exceptionResponse) };
    }

    if (!(exception instanceof HttpException)) {
      const err = exception as { message?: string; stack?: string } | undefined;
      this.logger.error(
        `Unhandled internal exception on ${request.method} ${safePath}: ${this.sanitizeText(err?.message || 'Unknown error')}`,
        isProduction ? undefined : err?.stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      ...errorBody,
      path: safePath,
      timestamp: new Date().toISOString(),
    });
  }
}
