import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: PrismaService;
  let storage: StorageService;

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
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
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get<PrismaService>(PrismaService);
    storage = module.get<StorageService>(StorageService);
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
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.createProject(userId, title, style, validBuffer);

      expect(result).toEqual(mockProject);
      expect(mockStorageService.saveBookFile).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          userId,
          title,
          bookText: 'Valid book text content.',
          bookFilePath: mockSavedPath,
          style,
          currentStep: 0,
          stepState: 'idle',
        },
      });
    });

    it('should throw BadRequestException if buffer is empty', async () => {
      const emptyBuffer = Buffer.from('   ');
      await expect(
        service.createProject(userId, title, style, emptyBuffer)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if buffer is not provided', async () => {
      await expect(
        service.createProject(userId, title, style, undefined)
      ).rejects.toThrow(BadRequestException);
    });

    it('should clean up storage if database insertion fails', async () => {
      mockStorageService.saveBookFile.mockResolvedValue('uploads/projects/proj-123/book.txt');
      mockPrismaService.project.create.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.createProject(userId, title, style, validBuffer)
      ).rejects.toThrow('DB Error');

      expect(mockStorageService.deleteProjectDir).toHaveBeenCalled();
    });
  });

  describe('findUserProjects', () => {
    it('should return projects belonging to the user', async () => {
      const userId = 'user-123';
      const mockProjects = [
        { id: 'proj-1', userId, title: 'Proj 1' },
        { id: 'proj-2', userId, title: 'Proj 2' },
      ];
      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.findUserProjects(userId);
      expect(result).toEqual(mockProjects);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOneUserProject', () => {
    const userId = 'user-123';
    const projectId = 'proj-123';

    it('should return the project if it exists and belongs to the user', async () => {
      const mockProject = { id: projectId, userId, title: 'Proj 1' };
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findOneUserProject(userId, projectId);
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException if the project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);
      await expect(
        service.findOneUserProject(userId, projectId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if the project belongs to another user', async () => {
      const mockProject = { id: projectId, userId: 'other-user', title: 'Proj 1' };
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      await expect(
        service.findOneUserProject(userId, projectId)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
