import { Injectable } from '@nestjs/common';
import { ResultAsync } from 'neverthrow';
import { PrismaService } from '../prisma/prisma.service';
import type { User as PrismaUser } from '@prisma/client';

/**
 * Data-access layer for User entities.
 * All methods return neverthrow `ResultAsync<T, Error>` for typed error handling.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): ResultAsync<PrismaUser | null, Error> {
    return ResultAsync.fromPromise(
      this.prisma.user.findUnique({ where: { email } }),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
  }

  findById(id: string): ResultAsync<PrismaUser | null, Error> {
    return ResultAsync.fromPromise(
      this.prisma.user.findUnique({ where: { id } }),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
  }

  /**
   * Upsert by email — create if not exists, update name if exists.
   * No password — identity is email + name only (per spec).
   */
  findOrCreate(email: string, name: string): ResultAsync<PrismaUser, Error> {
    return ResultAsync.fromPromise(
      this.prisma.user.upsert({
        where: { email },
        update: { name },
        create: { email, name },
      }),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
  }
}
