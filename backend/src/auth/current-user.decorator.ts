import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { User as PrismaUser } from '@prisma/client';

/**
 * @CurrentUser() parameter decorator — extracts authenticated user from request.
 * Usage: handler(@CurrentUser() user: PrismaUser)
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PrismaUser | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: PrismaUser }>();
    return request.user;
  },
);
