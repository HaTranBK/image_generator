import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User as PrismaUser } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /**
   * Upsert by email — create if not exists, update name if exists.
   * No password — identity is email + name only (per spec).
   */
  async findOrCreate(email: string, name: string): Promise<PrismaUser> {
    return this.prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name },
    });
  }
}
