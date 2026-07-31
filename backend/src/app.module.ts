import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParserService } from './modules/parser/parser.service';
import { ParserController } from './modules/parser/parser.controller';
import { ContextService } from './modules/context/context.service';
import { DatasetService } from './modules/dataset/dataset.service';
import { IntelligenceService } from './modules/intelligence/intelligence.service';
import { ScenarioService } from './modules/scenario/scenario.service';
import { AiAnalyzerService } from './modules/ai-analyzer/ai-analyzer.service';
import { RunnerService } from './modules/runner/runner.service';
import { RunnerController } from './modules/runner/runner.controller';
import { DatasetController } from './modules/dataset/dataset.controller';
import { IntelligenceController } from './modules/intelligence/intelligence.controller';
import { ScenarioController } from './modules/scenario/scenario.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { ApiSpecEntity } from './entities/api-spec.entity';
import { TestContextEntity } from './entities/test-context.entity';
import { StoredDatasetEntity } from './entities/stored-dataset.entity';
import { SmartMappingEntity } from './entities/smart-mapping.entity';
import { ExecutionLogEntity } from './entities/execution-log.entity';
import { SavedTestCaseEntity } from './entities/saved-test-case.entity';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'ai_api_tester',
        entities: [
          UserEntity,
          ApiSpecEntity,
          TestContextEntity,
          StoredDatasetEntity,
          SmartMappingEntity,
          ExecutionLogEntity,
          SavedTestCaseEntity,
        ],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      ApiSpecEntity,
      TestContextEntity,
      StoredDatasetEntity,
      SmartMappingEntity,
      ExecutionLogEntity,
      SavedTestCaseEntity,
    ]),
    AuthModule,
  ],
  controllers: [ParserController, RunnerController, DatasetController, IntelligenceController, ScenarioController],
  providers: [
    ParserService,
    ContextService,
    DatasetService,
    IntelligenceService,
    ScenarioService,
    AiAnalyzerService,
    RunnerService,
  ],
})
export class AppModule {}
