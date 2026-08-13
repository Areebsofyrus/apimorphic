import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from './jwt-auth.guard';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async register(email: string, password: string, name?: string): Promise<UserEntity> {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await this.userRepository.findOneBy({ email: cleanEmail });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new UserEntity();
    user.email = cleanEmail;
    user.passwordHash = passwordHash;
    user.name = name?.trim() || undefined;

    return this.userRepository.save(user);
  }

  async login(email: string, password: string): Promise<{ token: string; user: { id: string; email: string; name?: string; role: string; geminiApiKey?: string } }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findOneBy({ email: cleanEmail });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        geminiApiKey: user.geminiApiKey || undefined,
      },
    };
  }

  async getMe(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async saveKeys(userId: string, geminiApiKey: string): Promise<UserEntity> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.geminiApiKey = geminiApiKey.trim() ? geminiApiKey.trim() : null;
    return this.userRepository.save(user);
  }
}
