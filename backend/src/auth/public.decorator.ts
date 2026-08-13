import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a controller or route handler as public — skips JWT auth guard.
 * Use on: POST /auth/login, GET /health, etc.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
