import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import * as bcrypt from 'bcryptjs';

async function run() {
  console.log('🌱 Starting super admin seeder...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const userRepo = app.get(getRepositoryToken(UserEntity));
    const adminEmail = 'admin@yopmail.com';
    const exists = await userRepo.findOneBy({ email: adminEmail });
    if (!exists) {
      const user = new UserEntity();
      user.email = adminEmail;
      user.passwordHash = await bcrypt.hash('12345678', 10);
      user.name = 'Super Admin';
      user.role = 'superadmin';
      await userRepo.save(user);
      console.log('✅ Seeded super admin account (admin@yopmail.com)');
    } else {
      exists.role = 'superadmin';
      await userRepo.save(exists);
      console.log('ℹ️ Super admin user already exists. Verified admin privileges.');
    }
  } catch (err) {
    console.error('❌ Seeder failed:', err);
  } finally {
    await app.close();
  }
}

run();
