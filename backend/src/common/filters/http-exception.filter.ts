
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse = exception instanceof HttpException
            ? exception.getResponse()
            : { message: 'Internal Server Error' };

        const errorBody = typeof exceptionResponse === 'string'
            ? { message: exceptionResponse }
            : (exceptionResponse as object);

        if (!(exception instanceof HttpException)) {
            console.error('Unhandled internal exception:', exception);
        }

        response
            .status(status)
            .json({
                statusCode: status,
                ...errorBody,
                path: request.url,
                timestamp: new Date().toISOString(),
            });
    }
}
