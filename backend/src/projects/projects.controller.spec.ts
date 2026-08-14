import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { BadRequestException } from '@nestjs/common';
import type { User as PrismaUser } from '@prisma/client';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: ProjectsService;

  const mockUser: PrismaUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
  };

  const mockProjectsService = {
    createProject: jest.fn(),
    findUserProjects: jest.fn(),
    findOneUserProject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should upload a file and create a project', async () => {
      const dto: CreateProjectDto = { title: 'New Book', style: 'Watercolor' };
      const mockFile = {
        buffer: Buffer.from('test book content'),
        originalname: 'book.txt',
        mimetype: 'text/plain',
      } as Express.Multer.File;

      const mockProject = {
        id: 'proj-123',
        userId: mockUser.id,
        title: dto.title,
        style: dto.style,
        bookText: 'test book content',
        bookFilePath: 'uploads/projects/proj-123/book.txt',
      };

      mockProjectsService.createProject.mockResolvedValue(mockProject);

      const result = await controller.create(mockUser, mockFile, dto);

      expect(result).toEqual(mockProject);
      expect(mockProjectsService.createProject).toHaveBeenCalledWith(
        mockUser.id,
        dto.title,
        dto.style,
        mockFile.buffer,
      );
    });

    it('should throw BadRequestException if file is missing', async () => {
      const dto: CreateProjectDto = { title: 'New Book' };
      await expect(controller.create(mockUser, undefined, dto)).rejects.toThrow(
        new BadRequestException('Book file (.txt) is required'),
      );
    });
  });

  describe('findAll', () => {
    it('should return all projects of the logged-in user', async () => {
      const mockProjects = [
        { id: '1', title: 'Proj 1', userId: mockUser.id },
        { id: '2', title: 'Proj 2', userId: mockUser.id },
      ];
      mockProjectsService.findUserProjects.mockResolvedValue(mockProjects);

      const result = await controller.findAll(mockUser);
      expect(result).toEqual(mockProjects);
      expect(mockProjectsService.findUserProjects).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('findOne', () => {
    it('should return project details if it exists and belongs to the user', async () => {
      const mockProject = { id: 'proj-123', title: 'Proj 1', userId: mockUser.id };
      mockProjectsService.findOneUserProject.mockResolvedValue(mockProject);

      const result = await controller.findOne(mockUser, 'proj-123');
      expect(result).toEqual(mockProject);
      expect(mockProjectsService.findOneUserProject).toHaveBeenCalledWith(
        mockUser.id,
        'proj-123',
      );
    });
  });
});
