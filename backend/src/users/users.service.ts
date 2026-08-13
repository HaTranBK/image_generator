import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import type { User as PrismaUser } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findOrCreate(email: string, name: string): Promise<PrismaUser> {
    return this.usersRepository.findOrCreate(email, name);
  }

  async findById(id: string): Promise<PrismaUser | null> {
    return this.usersRepository.findById(id);
  }
}
