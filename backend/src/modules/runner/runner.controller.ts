import { Controller, Post, Body, Get, Query, BadRequestException, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutionLogEntity } from '../../entities/execution-log.entity';
import { StoredDatasetEntity } from '../../entities/stored-dataset.entity';
import { ApiSpecEntity } from '../../entities/api-spec.entity';
import { SmartMappingEntity } from '../../entities/smart-mapping.entity';
import { UserEntity } from '../../entities/user.entity';
import { RunnerService, ExecutionRequest } from './runner.service';
import { ScenarioService } from '../scenario/scenario.service';
import { DatasetService } from '../dataset/dataset.service';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('runner')
@UseGuards(JwtAuthGuard)
export class RunnerController {
  constructor(
    private readonly runnerService: RunnerService,
    private readonly scenarioService: ScenarioService,
    private readonly datasetService: DatasetService,
    private readonly intelligenceService: IntelligenceService,
    @InjectRepository(ExecutionLogEntity)
    private readonly executionLogRepository: Repository<ExecutionLogEntity>,
    @InjectRepository(StoredDatasetEntity)
    private readonly datasetRepository: Repository<StoredDatasetEntity>,
    @InjectRepository(ApiSpecEntity)
    private readonly specRepository: Repository<ApiSpecEntity>,
    @InjectRepository(SmartMappingEntity)
    private readonly mappingRepository: Repository<SmartMappingEntity>,
  ) {}

  @Get('model')
  async getModel(@Req() req: any, @Query('geminiApiKey') geminiApiKey?: string) {
    let userKey: string | undefined = undefined;
    if (geminiApiKey !== undefined) {
      userKey = geminiApiKey.trim() || undefined;
    } else {
      const user = await this.specRepository.manager.findOneBy(UserEntity, { id: req.user.userId });
      userKey = user?.geminiApiKey || undefined;
    }
    const model = await this.runnerService.getActiveModel(userKey);
    return { model };
  }

  @Get('history-by-endpoint')
  async getHistoryByEndpoint(
    @Query('endpointPath') endpointPath: string,
    @Query('method') method: string,
    @Query('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    if (!endpointPath || !method || !workspaceId) {
      throw new BadRequestException('endpointPath, method, and workspaceId are required');
    }

    const workspace = await this.specRepository.findOne({
      where: { id: workspaceId, user: { id: req.user.userId } },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }

    const regex = endpointPath
  .replace(/\{[^}]+\}/g, '[^/]+') // Replace {patientId} with any path segment
  .replace(/\//g, '\\/');


    // return this.executionLogRepository.find({
    //   where: { endpointPath, httpMethod: method, workspace: { id: workspaceId } },
    //   order: { executedAt: 'DESC' },
    //   take: 10,
    // });
   
return this.executionLogRepository
  .createQueryBuilder('log')
  .where('log.httpMethod = :method', { method })
  .andWhere('log.workspaceId = :workspaceId', { workspaceId })
  .andWhere('log.endpointPath ~ :regex', {
    regex: `^${regex}$`,
  })
  .orderBy('log.executedAt', 'DESC')
  .limit(10)
  .getMany();
  }

  @Get('history')
  async getHistory(@Req() req: any) {
    const list = await this.executionLogRepository.find({
      where: { workspace: { user: { id: req.user.userId } } },
      order: { executedAt: 'DESC' },
      take: 20,
    });
    return list.map((l) => ({
      id: l.id,
      timestamp: l.executedAt.toISOString().replace('T', ' ').slice(0, 19),
      endpoint: l.endpointPath,
      method: l.httpMethod,
      totalTests: 1,
      passed: l.passed ? 1 : 0,
      failed: l.passed ? 0 : 1,
      responseTimeMs: l.responseTimeMs,
    }));
  }

  @Post('execute')
  async executeSingle(@Req() req: any, @Body() body: ExecutionRequest & { workspaceId: string }) {
    if (!body.workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    const workspace = await this.specRepository.findOne({
      where: { id: body.workspaceId, user: { id: req.user.userId } },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }

    // Attach user's Gemini Key if not provided in request
    const user = await this.specRepository.manager.findOneBy(UserEntity, { id: req.user.userId });
    if (!body.geminiApiKey && user?.geminiApiKey) {
      body.geminiApiKey = user.geminiApiKey;
    }

    const result = await this.runnerService.executeTest(body);

    const log = new ExecutionLogEntity();
    log.workspace = workspace;
    log.endpointPath = body.endpoint;
    log.httpMethod = body.method;
    log.scenarioName = body.scenarioName || 'Manual Test';
    log.generationRule = body.generationRule || 'manual';
    log.statusCode = result.statusCode;
    log.responseTimeMs = result.responseTimeMs;
    log.passed = result.passed;
    log.requestPayload = body.payload || {};
    log.responseBody = result.responseBody;
    log.aiExplanation = result.aiExplanation;
    log.aiModel = result.aiModel;

    await this.executionLogRepository.save(log);

    // Auto-capture dataset if successful (2xx status)
    if (result.statusCode >= 200 && result.statusCode < 350) {
      await this.autoCaptureDataset(req.user.userId, workspace, body.endpoint, result.responseBody);
    }

    return result;
  }

  @Post('execute-suite')
  async executeSuite(@Req() req: any, @Body() body: { requests: ExecutionRequest[]; concurrency?: number; workspaceId: string }) {
    if (!body.workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    const workspace = await this.specRepository.findOne({
      where: { id: body.workspaceId, user: { id: req.user.userId } },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }

    // Attach user's Gemini Key to all requests if not provided
    const user = await this.specRepository.manager.findOneBy(UserEntity, { id: req.user.userId });
    body.requests.forEach((r) => {
      if (!r.geminiApiKey && user?.geminiApiKey) {
        r.geminiApiKey = user.geminiApiKey;
      }
    });

    const results = await this.runnerService.executeSuiteConcurrently(body.requests, body.concurrency);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const reqItem = body.requests[i];
      const log = new ExecutionLogEntity();
      log.workspace = workspace;
      log.endpointPath = reqItem.endpoint;
      log.httpMethod = reqItem.method;
      log.scenarioName = result.scenarioName;
      log.generationRule = result.generationRule;
      log.statusCode = result.statusCode;
      log.responseTimeMs = result.responseTimeMs;
      log.passed = result.passed;
      log.requestPayload = result.requestPayload || {};
      log.responseBody = result.responseBody;
      log.aiExplanation = result.aiExplanation;
      log.aiModel = result.aiModel;

      await this.executionLogRepository.save(log);

      // Auto-capture dataset if successful
      if (result.statusCode >= 200 && result.statusCode < 350) {
        await this.autoCaptureDataset(req.user.userId, workspace, reqItem.endpoint, result.responseBody);
      }
    }

    return results;
  }

  private async autoCaptureDataset(userId: string, workspace: ApiSpecEntity, endpointPath: string, responseBody: any) {
    try {
      const detectResult = this.datasetService.detectCollection(responseBody);
      if (detectResult.isCollection && detectResult.records.length > 0) {
        const clean = endpointPath.replace(/\/$/, '');
        const parts = clean.split('/');
        let lastPart = parts[parts.length - 1] || 'Default';
        
        if (parts.length >= 2 && (/^\d+$/.test(lastPart) || /^[0-9a-fA-F-]{36}$/.test(lastPart))) {
          lastPart = parts[parts.length - 2];
        }
        
        const datasetName = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);

        let dataset = await this.datasetRepository.findOne({
          where: { datasetName, user: { id: userId } },
        });
        if (!dataset) {
          dataset = new StoredDatasetEntity();
          dataset.datasetName = datasetName;
          dataset.user = { id: userId } as any;
        }
        dataset.sourceEndpoint = endpointPath;
        dataset.detectedFields = Object.keys(detectResult.records[0] || {});
        dataset.records = detectResult.records;
        dataset.totalRecords = detectResult.records.length;

        await this.datasetRepository.save(dataset);
        console.log(`[RunnerController] Auto-captured dataset: "${datasetName}" with ${detectResult.records.length} records`);

        await this.generateSmartMappingsForCapturedData(userId);
      }
    } catch (err: any) {
      console.warn(`[RunnerController] Auto-capture dataset failed:`, err.message);
    }
  }

  private async generateSmartMappingsForCapturedData(userId: string) {
    try {
      const allRequestFields: string[] = [];
      const specs = await this.specRepository.find({
        where: { user: { id: userId } },
      });
      specs.forEach((spec) => {
        if (spec.endpoints) {
          spec.endpoints.forEach((ep) => {
            if (ep.requestSchema && ep.requestSchema.properties) {
              Object.keys(ep.requestSchema.properties).forEach((key) => {
                if (!allRequestFields.includes(key)) {
                  allRequestFields.push(key);
                }
              });
            }
          });
        }
      });

      const datasets = await this.datasetRepository.find({
        where: { user: { id: userId } },
      });
      const availableDatasets = datasets.map((d) => ({
        datasetName: d.datasetName,
        fields: d.detectedFields || [],
      }));

      const suggestions = this.intelligenceService.suggestMappings(allRequestFields, availableDatasets);

      for (const suggestion of suggestions) {
        let mapping = await this.mappingRepository.findOne({
          where: {
            sourceField: suggestion.paramName,
            datasetName: suggestion.suggestedDataset,
            targetField: suggestion.suggestedField,
            user: { id: userId },
          },
        });

        if (!mapping) {
          mapping = new SmartMappingEntity();
          mapping.sourceField = suggestion.paramName;
          mapping.datasetName = suggestion.suggestedDataset;
          mapping.targetField = suggestion.suggestedField;
          mapping.userApproved = false;
          mapping.user = { id: userId } as any;
          await this.mappingRepository.save(mapping);
          console.log(
            `[RunnerController] Created pending mapping rule: ${mapping.sourceField} ➔ ${mapping.datasetName}.${mapping.targetField}`,
          );
        }
      }
    } catch (err: any) {
      console.error(`[RunnerController] Smart mapping generation failed:`, err.message);
    }
  }

  @Post('generate-scenarios')
  async generateScenarios(
    @Body() body: { schema: Record<string, unknown>; endpointSummary?: string; path?: string; method?: string; enrichWithAi?: boolean; geminiApiKey?: string; parameters?: any[] },
  ) {
    const ruleScenarios = await this.scenarioService.generateRuleBasedScenarios(
      body.schema,
      body.path || '',
      body.method || '',
      body.parameters,
    );
    
    if (body.enrichWithAi) {
      try {
        const aiScenarios = await this.scenarioService.generateAICases(
          body.schema,
          body.path || '',
          body.method || '',
          body.endpointSummary,
          body.geminiApiKey,
          body.parameters,
        );
        ruleScenarios.push(...aiScenarios);
      } catch (err: any) {
        console.warn('AI enrichment skipped or failed:', err.message);
      }
    }

    return ruleScenarios;
  }

  @Post('delete-log')
  async deleteLog(@Req() req: any, @Body() body: { id: string }) {
    if (!body.id) {
      throw new BadRequestException('Log ID is required');
    }
    const log = await this.executionLogRepository.findOne({
      where: { id: body.id, workspace: { user: { id: req.user.userId } } },
    });
    if (!log) {
      throw new NotFoundException('Log not found or unauthorized');
    }
    await this.executionLogRepository.remove(log);
    return { success: true };
  }

  @Post('clear-endpoint-history')
  async clearEndpointHistory(@Req() req: any, @Body() body: { endpointPath: string; method: string; workspaceId: string }) {
    if (!body.endpointPath || !body.method || !body.workspaceId) {
      throw new BadRequestException('endpointPath, method, and workspaceId are required');
    }
    const workspace = await this.specRepository.findOne({
      where: { id: body.workspaceId, user: { id: req.user.userId } },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }

    await this.executionLogRepository.delete({
      endpointPath: body.endpointPath,
      httpMethod: body.method,
      workspace: { id: body.workspaceId },
    });
    return { success: true };
  }
}
