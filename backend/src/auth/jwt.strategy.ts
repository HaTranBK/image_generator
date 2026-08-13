import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtPayload } from '../common/types';
import { AUTH_COOKIE_NAME } from '../common/constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      // Extract JWT from httpOnly cookie (preferred) or Authorization header (fallback)
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.[AUTH_COOKIE_NAME] ?? null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validatePayload(payload);
    if (!user) {
      throw new UnauthorizedException('User not found or token invalid');
    }
    return user; // attached to req.user
  }
}
