import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

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

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal Server Error' };

    const isProduction = process.env.NODE_ENV === 'production';

    let errorBody: any;
    if (typeof exceptionResponse === 'string') {
      errorBody = { message: exceptionResponse };
    } else if (isProduction && status >= 500) {
      // In production, don't leak internal error details for 5xx errors
      errorBody = { message: 'Internal Server Error' };
    } else if (isProduction) {
      // In production for 4xx, only return the message (not full validation details stack)
      const resp = exceptionResponse as Record<string, any>;
      errorBody = { message: resp.message || 'An error occurred' };
    } else {
      errorBody = exceptionResponse;
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
