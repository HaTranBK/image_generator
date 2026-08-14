import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Structured HTTP exception with an error code string and optional debug data.
 * Used by controllers to throw well-formatted, typed errors that
 * HttpExceptionFilter will serialize into the standard error envelope.
 */
export class CustomException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    status: HttpStatus,
    public readonly debugData?: unknown,
  ) {
    super(message, status);
  }
}
