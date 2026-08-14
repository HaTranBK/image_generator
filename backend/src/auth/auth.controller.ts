/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import type { User as PrismaUser } from '@prisma/client';
import { AUTH_COOKIE_NAME, JWT_EXPIRES_IN } from '../common/constants';

/** Parse JWT_EXPIRES_IN ('7d') to milliseconds for cookie maxAge */
function parseExpiresInMs(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Body: { email: string, name: string }
   * Response: 200 with user object; JWT stored in httpOnly cookie.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,

    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.authService.login(
      loginDto.email,
      loginDto.name,
    );

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseExpiresInMs(JWT_EXPIRES_IN),
      path: '/',
    });

    // Return user info and the token (for WS auth query param)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      token,
    };
  }

  /**
   * POST /auth/logout
   * Clears the session cookie.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    return { message: 'Logged out successfully' };
  }

  /**
   * GET /auth/me
   * Returns the current authenticated user.
   */
  @Get('me')
  me(@CurrentUser() user: PrismaUser, @Req() req: any) {
    if (!user) throw new UnauthorizedException();
    // Extract token from request cookies (or authorization header fallback)
    const token =
      req.cookies?.[AUTH_COOKIE_NAME] ??
      req.headers.authorization?.replace('Bearer ', '');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      token,
    };
  }
}
