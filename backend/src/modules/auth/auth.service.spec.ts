import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from '../../entities/user.entity';
import { AuthService } from './auth.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findOneBy: jest.fn(),
      save: jest.fn((user) => Promise.resolve({ id: 'mock-uuid', ...user })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully without name', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const email = 'test@example.com';
      const password = 'my-password';
      const result = await service.register(email, password);

      expect(result.email).toBe(email);
      expect(result.passwordHash).toBeDefined();
      expect(result.name).toBeUndefined();
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ email });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should register a new user successfully with name', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const email = 'test2@example.com';
      const password = 'my-password';
      const name = 'Alice Smith';
      const result = await service.register(email, password, name);

      expect(result.email).toBe(email);
      expect(result.passwordHash).toBeDefined();
      expect(result.name).toBe(name);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ email });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      mockRepository.findOneBy.mockResolvedValue({ id: 'existing' });

      await expect(service.register('test@example.com', 'password', 'Bob')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'my-password';
      const passwordHash = await bcrypt.hash(password, 10);

      mockRepository.findOneBy.mockResolvedValue({
        id: 'user-id-123',
        email,
        passwordHash,
        geminiApiKey: 'test-key',
      });

      const result = await service.login(email, password);

      expect(result.token).toBeDefined();
      expect(result.user.id).toBe('user-id-123');
      expect(result.user.email).toBe(email);
      expect(result.user.geminiApiKey).toBe('test-key');
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.login('fake@example.com', 'pwd')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      const passwordHash = await bcrypt.hash('real-pwd', 10);
      mockRepository.findOneBy.mockResolvedValue({
        email: 'test@example.com',
        passwordHash,
      });

      await expect(service.login('test@example.com', 'wrong-pwd')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
