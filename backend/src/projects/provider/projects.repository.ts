import { Injectable } from '@nestjs/common';
import { ResultAsync } from 'neverthrow';
import { PrismaService } from '../../prisma/prisma.service';
import type { Project } from '@prisma/client';
import type { Portrait, Illustration } from '../../common/types';

/**
 * Data-access layer for Project entities.
 * All methods return neverthrow `ResultAsync<T, Error>` so callers
 * can handle failures without try/catch — errors are part of the type.
 */
@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a new project record */
  create(
    data: Parameters<PrismaService['project']['create']>[0]['data'],
  ): ResultAsync<Project, Error> {
    return ResultAsync.fromPromise(this.prisma.project.create({ data }), (e) =>
      e instanceof Error ? e : new Error(String(e)),
    );
  }

  /** List all projects for a given user, ordered by creation date (newest first) */
  findMany(userId: string): ResultAsync<Project[], Error> {
    return ResultAsync.fromPromise(
      this.prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
  }

  /** Find a single project by its ID (returns null inside ok if not found) */
  findUnique(id: string): ResultAsync<Project | null, Error> {
    return ResultAsync.fromPromise(
      this.prisma.project.findUnique({ where: { id } }),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
  }

  /** Find a single project and throw if not found */
  findUniqueOrThrow(id: string): ResultAsync<Project, Error> {
    return ResultAsync.fromPromise(
      this.prisma.project.findUniqueOrThrow({ where: { id } }),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
  }

  /** Update an existing project */
  update(
    id: string,
    data: Parameters<PrismaService['project']['update']>[0]['data'],
  ): ResultAsync<Project, Error> {
    return ResultAsync.fromPromise(
      this.prisma.project.update({ where: { id }, data }),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
  }

  /**
   * Append a portrait to the portraits JSON array of a project.
   * Reads current portraits first, then updates atomically.
   */
  savePortrait(
    projectId: string,
    portrait: Portrait,
  ): ResultAsync<Project, Error> {
    return ResultAsync.fromPromise(
      this.prisma.project
        .findUniqueOrThrow({ where: { id: projectId } })
        .then((project) => {
          const existing = (project.portraits as unknown as Portrait[]) || [];
          return this.prisma.project.update({
            where: { id: projectId },
            data: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              portraits: [...existing, portrait] as object[] as any,
            },
          });
        }),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
  }

  /**
   * Append an illustration to the illustrations JSON array of a project.
   */
  saveIllustration(
    projectId: string,
    illustration: Illustration,
  ): ResultAsync<Project, Error> {
    return ResultAsync.fromPromise(
      this.prisma.project
        .findUniqueOrThrow({ where: { id: projectId } })
        .then((project) => {
          const existing =
            (project.illustrations as unknown as Illustration[]) || [];
          return this.prisma.project.update({
            where: { id: projectId },
            data: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              illustrations: [...existing, illustration] as object[] as any,
            },
          });
        }),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
  }
}
