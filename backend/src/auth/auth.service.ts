import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../common/types';
import type { User as PrismaUser } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Login flow:
   * 1. Upsert user by email (creates on first login, updates name if changed)
   * 2. Sign JWT with user id + email
   * 3. Return the signed token (controller sets it as httpOnly cookie)
   */
  async login(
    email: string,
    name: string,
  ): Promise<{ token: string; user: PrismaUser }> {
    const user = await this.usersService.findOrCreate(email, name);

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    this.logger.log(`User ${user.id} logged in`);
    return { token, user };
  }

  /**
   * Validate a decoded JWT payload — called by JwtStrategy.
   * Returns the user if found, null otherwise (guard handles rejection).
   */
  async validatePayload(payload: JwtPayload): Promise<PrismaUser | null> {
    return this.usersService.findById(payload.sub);
  }
}
