import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { CustomException } from '../exceptions/custom-exception';

/**
 * Global filter that catches all HttpException (including CustomException)
 * and serializes them into a standardized error envelope:
 *
 * {
 *   "code": "ERROR_CODE_STRING",
 *   "message": "Human-readable description",
 *   "errors": []          // additional context when available
 * }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    // Extract error body — NestJS may return a string or an object
    const exceptionResponse = exception.getResponse();
    const rawMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as Record<string, unknown>).message ??
          exception.message);

    // Normalize validation error arrays (class-validator returns string[])
    const errors: string[] = Array.isArray(rawMessage)
      ? (rawMessage as string[])
      : [];

    const message: string = Array.isArray(rawMessage)
      ? 'Validation failed'
      : typeof rawMessage === 'string'
        ? rawMessage
        : exception.message;

    // Use errorCode from CustomException when available, otherwise derive from status
    const code: string =
      exception instanceof CustomException
        ? exception.errorCode
        : (HttpStatus[status] ?? 'INTERNAL_ERROR');

    this.logger.warn(`[${status}] ${code}: ${message}`);

    response.status(status).json({
      code,
      message,
      errors,
    });
  }
}
