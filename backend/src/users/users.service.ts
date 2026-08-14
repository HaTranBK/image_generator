import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import type { User as PrismaUser } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findOrCreate(email: string, name: string): Promise<PrismaUser> {
    const result = await this.usersRepository.findOrCreate(email, name);
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);
    return result.value;
  }

  async findById(id: string): Promise<PrismaUser | null> {
    const result = await this.usersRepository.findById(id);
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);
    return result.value;
  }
}
