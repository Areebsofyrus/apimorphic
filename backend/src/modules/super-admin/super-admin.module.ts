import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { UserEntity } from '../../entities/user.entity';
import { ApiSpecEntity } from '../../entities/api-spec.entity';
import { ExecutionLogEntity } from '../../entities/execution-log.entity';
import { SavedTestCaseEntity } from '../../entities/saved-test-case.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ApiSpecEntity,
      ExecutionLogEntity,
      SavedTestCaseEntity,
    ]),
  ],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}
