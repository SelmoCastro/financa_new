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

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal Server Error' };

    const isProduction = process.env.NODE_ENV === 'production';

    // Log 4xx validation errors in detail
    if (exception instanceof HttpException && status >= 400 && status < 500) {
      this.logger.warn(`HTTP ${status} ${request.method} ${request.url}: ${JSON.stringify(exceptionResponse)}`);
    }

    let errorBody: Record<string, unknown>;
    if (typeof exceptionResponse === 'string') {
      // Sanitize JSON parse errors — don't leak parser details
      const sanitized = exceptionResponse.replace(/^Expected .+ in JSON at position \d+$/,
        'Invalid request body');
      errorBody = { message: sanitized };
    } else if (isProduction && status >= 500) {
      // In production, don't leak internal error details for 5xx errors
      errorBody = { message: 'Internal Server Error' };
    } else if (isProduction) {
      // In production for 4xx, only return the message (not full validation details stack)
      const resp = exceptionResponse as Record<string, any>;
      errorBody = { message: resp.message || 'An error occurred' };
    } else {
      errorBody = typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse as Record<string, unknown>
        : { message: String(exceptionResponse) };
    }

    if (!(exception instanceof HttpException)) {
      console.error('Unhandled internal exception:', exception);
    }

    response.status(status).json({
      statusCode: status,
      ...errorBody,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
