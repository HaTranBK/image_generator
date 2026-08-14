import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { ProjectsRepository } from './provider/projects.repository';
import { StorageService } from '../storage/storage.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ok, err } from 'neverthrow';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockProjectsRepository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    savePortrait: jest.fn(),
    saveIllustration: jest.fn(),
  };

  const mockStorageService = {
    saveBookFile: jest.fn(),
    saveBookText: jest.fn(),
    readBookText: jest.fn(),
    deleteProjectDir: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: ProjectsRepository, useValue: mockProjectsRepository },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProject', () => {
    const userId = 'user-123';
    const title = 'Test Project';
    const style = 'Anime';
    const validBuffer = Buffer.from('Valid book text content.');

    it('should successfully create a project', async () => {
      const mockSavedPath = 'uploads/projects/proj-123/book.txt';
      const mockProject = {
        id: 'proj-123',
        userId,
        title,
        bookText: 'Valid book text content.',
        bookFilePath: mockSavedPath,
        style,
        currentStep: 0,
        stepState: 'idle',
      };

      mockStorageService.saveBookFile.mockResolvedValue(mockSavedPath);
      mockProjectsRepository.create.mockResolvedValue(ok(mockProject));

      const result = await service.createProject(
        userId,
        title,
        style,
        validBuffer,
      );

      expect(result).toEqual(mockProject);
      expect(mockStorageService.saveBookFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
      );
      expect(mockProjectsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          title,
          bookText: 'Valid book text content.',
          bookFilePath: mockSavedPath,
          style,
          currentStep: 0,
          stepState: 'idle',
        }),
      );
    });

    it('should throw BadRequestException if buffer is empty', async () => {
      const emptyBuffer = Buffer.from('   ');
      await expect(
        service.createProject(userId, title, style, emptyBuffer),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if buffer is not provided', async () => {
      await expect(
        service.createProject(userId, title, style, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clean up storage if database insertion fails', async () => {
      mockStorageService.saveBookFile.mockResolvedValue(
        'uploads/projects/proj-123/book.txt',
      );
      mockProjectsRepository.create.mockResolvedValue(
        err(new Error('DB Error')),
      );
      mockStorageService.deleteProjectDir.mockResolvedValue(undefined);

      await expect(
        service.createProject(userId, title, style, validBuffer),
      ).rejects.toThrow('DB Error');

      expect(mockStorageService.deleteProjectDir).toHaveBeenCalled();
    });
  });

  describe('findUserProjects', () => {
    it('should return projects belonging to the user', async () => {
      const userId = 'user-123';
      const mockProjects = [
        {
          id: 'proj-1',
          userId,
          title: 'Proj 1',
          currentStep: 0,
          stepState: 'idle',
          stuckAt: null,
        },
        {
          id: 'proj-2',
          userId,
          title: 'Proj 2',
          currentStep: 0,
          stepState: 'idle',
          stuckAt: null,
        },
      ];
      mockProjectsRepository.findMany.mockResolvedValue(ok(mockProjects));

      const result = await service.findUserProjects(userId);
      // Status field is added by the service
      expect(result[0]).toMatchObject({ id: 'proj-1', status: 'Draft' });
      expect(result[1]).toMatchObject({ id: 'proj-2', status: 'Draft' });
    });
  });

  describe('findOneUserProject', () => {
    const userId = 'user-123';
    const projectId = 'proj-123';

    it('should return the project if it exists and belongs to the user', async () => {
      const mockProject = {
        id: projectId,
        userId,
        title: 'Proj 1',
        currentStep: 0,
        stepState: 'idle',
        stuckAt: null,
      };
      mockProjectsRepository.findUnique.mockResolvedValue(ok(mockProject));

      const result = await service.findOneUserProject(userId, projectId);
      expect(result).toMatchObject({ id: projectId, status: 'Draft' });
    });

    it('should throw NotFoundException if the project does not exist', async () => {
      mockProjectsRepository.findUnique.mockResolvedValue(ok(null));
      await expect(
        service.findOneUserProject(userId, projectId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if the project belongs to another user', async () => {
      const mockProject = {
        id: projectId,
        userId: 'other-user',
        title: 'Proj 1',
        currentStep: 0,
        stepState: 'idle',
        stuckAt: null,
      };
      mockProjectsRepository.findUnique.mockResolvedValue(ok(mockProject));

      await expect(
        service.findOneUserProject(userId, projectId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
