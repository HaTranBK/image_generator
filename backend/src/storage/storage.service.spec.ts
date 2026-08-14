import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('StorageService', () => {
  let service: StorageService;
  const mockUploadsDir = path.join(__dirname, '..', '..', 'test-uploads');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: StorageService,
          useFactory: () => {
            const svc = new StorageService();
            // Override the upload directory path for tests to avoid cluttering real uploads
            (svc as any).uploadsDir = mockUploadsDir;
            return svc;
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(async () => {
    try {
      await fs.rm(mockUploadsDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveBookText', () => {
    it('should create project directory and save book text correctly', async () => {
      const projectId = 'test-project-1';
      const content = 'Hello world, this is a test book content.';
      const relativePath = await service.saveBookText(projectId, 'book.txt', content);

      expect(relativePath).toContain(path.join('uploads', 'projects', projectId, 'book.txt'));
      const absolutePath = path.join(mockUploadsDir, 'projects', projectId, 'book.txt');
      const savedContent = await fs.readFile(absolutePath, 'utf-8');
      expect(savedContent).toBe(content);
    });

    it('should prevent directory traversal attacks', async () => {
      const maliciousProjectId = '../malicious-dir';
      await expect(
        service.saveBookText(maliciousProjectId, 'book.txt', 'hack')
      ).rejects.toThrow('Invalid project ID or path traversal detected');
    });
  });

  describe('saveBookFile', () => {
    it('should save a Multer file buffer correctly', async () => {
      const projectId = 'test-project-2';
      const mockFile = {
        originalname: 'book.txt',
        buffer: Buffer.from('Multer buffer test content'),
        mimetype: 'text/plain',
      } as Express.Multer.File;

      const relativePath = await service.saveBookFile(projectId, mockFile);
      expect(relativePath).toContain(path.join('uploads', 'projects', projectId, 'book.txt'));

      const absolutePath = path.join(mockUploadsDir, 'projects', projectId, 'book.txt');
      const savedContent = await fs.readFile(absolutePath, 'utf-8');
      expect(savedContent).toBe('Multer buffer test content');
    });
  });

  describe('readBookText', () => {
    it('should read stored book content correctly', async () => {
      const projectId = 'test-project-3';
      const content = 'Read this file please.';
      await service.saveBookText(projectId, 'book.txt', content);

      const readContent = await service.readBookText(projectId);
      expect(readContent).toBe(content);
    });

    it('should throw error if file does not exist', async () => {
      await expect(service.readBookText('non-existent')).rejects.toThrow();
    });
  });

  describe('deleteProjectDir', () => {
    it('should remove project directory recursively', async () => {
      const projectId = 'test-project-4';
      await service.saveBookText(projectId, 'book.txt', 'Delete me');

      const projectDir = path.join(mockUploadsDir, 'projects', projectId);
      let dirExists = await fs.stat(projectDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);

      await service.deleteProjectDir(projectId);

      dirExists = await fs.stat(projectDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(false);
    });

    it('should prevent directory traversal when deleting', async () => {
      await expect(service.deleteProjectDir('../')).rejects.toThrow('Invalid project ID or path traversal detected');
    });
  });
});
