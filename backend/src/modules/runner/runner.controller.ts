import { Controller, Post, Body, Get, Query, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutionLogEntity } from '../../entities/execution-log.entity';
import { StoredDatasetEntity } from '../../entities/stored-dataset.entity';
import { ApiSpecEntity } from '../../entities/api-spec.entity';
import { SmartMappingEntity } from '../../entities/smart-mapping.entity';
import { RunnerService, ExecutionRequest } from './runner.service';
import { ScenarioService } from '../scenario/scenario.service';
import { DatasetService } from '../dataset/dataset.service';
import { IntelligenceService } from '../intelligence/intelligence.service';

@Controller('runner')
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
  async getModel() {
    const model = process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:3b';
    return { model };
  }

  @Get('history-by-endpoint')
  async getHistoryByEndpoint(@Query('endpointPath') endpointPath: string, @Query('method') method: string) {
    if (!endpointPath || !method) {
      throw new BadRequestException('endpointPath and method are required');
    }
    return this.executionLogRepository.find({
      where: { endpointPath, httpMethod: method },
      order: { executedAt: 'DESC' },
      take: 10,
    });
  }

  @Get('history')
  async getHistory() {
    const list = await this.executionLogRepository.find({
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
    }));
  }

  @Post('execute')
  async executeSingle(@Body() body: ExecutionRequest) {
    const result = await this.runnerService.executeTest(body);

    const log = new ExecutionLogEntity();
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

    await this.executionLogRepository.save(log);

    // Auto-capture dataset if successful (2xx status)
    if (result.statusCode >= 200 && result.statusCode < 350) {
      await this.autoCaptureDataset(body.endpoint, result.responseBody);
    }

    return result;
  }

  @Post('execute-suite')
  async executeSuite(@Body() body: { requests: ExecutionRequest[]; concurrency?: number }) {
    const results = await this.runnerService.executeSuiteConcurrently(body.requests, body.concurrency);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const req = body.requests[i];
      const log = new ExecutionLogEntity();
      log.endpointPath = req.endpoint;
      log.httpMethod = req.method;
      log.scenarioName = result.scenarioName;
      log.generationRule = result.generationRule;
      log.statusCode = result.statusCode;
      log.responseTimeMs = result.responseTimeMs;
      log.passed = result.passed;
      log.requestPayload = result.requestPayload || {};
      log.responseBody = result.responseBody;
      log.aiExplanation = result.aiExplanation;

      await this.executionLogRepository.save(log);

      // Auto-capture dataset if successful
      if (result.statusCode >= 200 && result.statusCode < 350) {
        await this.autoCaptureDataset(req.endpoint, result.responseBody);
      }
    }

    return results;
  }

  private async autoCaptureDataset(endpointPath: string, responseBody: any) {
    try {
      const detectResult = this.datasetService.detectCollection(responseBody);
      if (detectResult.isCollection && detectResult.records.length > 0) {
        // Derive dataset name: "/api/v1/appointments" -> "Appointments"
        const clean = endpointPath.replace(/\/$/, '');
        const parts = clean.split('/');
        let lastPart = parts[parts.length - 1] || 'Default';
        
        // If last part is a number or UUID, take second-to-last
        if (parts.length >= 2 && (/^\d+$/.test(lastPart) || /^[0-9a-fA-F-]{36}$/.test(lastPart))) {
          lastPart = parts[parts.length - 2];
        }
        
        const datasetName = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);

        let dataset = await this.datasetRepository.findOneBy({ datasetName });
        if (!dataset) {
          dataset = new StoredDatasetEntity();
          dataset.datasetName = datasetName;
        }
        dataset.sourceEndpoint = endpointPath;
        dataset.detectedFields = Object.keys(detectResult.records[0] || {});
        dataset.records = detectResult.records;
        dataset.totalRecords = detectResult.records.length;

        await this.datasetRepository.save(dataset);
        console.log(`[RunnerController] Auto-captured dataset: "${datasetName}" with ${detectResult.records.length} records`);

        // Generate and update Smart Mapping rules dynamically!
        await this.generateSmartMappingsForCapturedData();
      }
    } catch (err: any) {
      console.warn(`[RunnerController] Auto-capture dataset failed:`, err.message);
    }
  }

  private async generateSmartMappingsForCapturedData() {
    try {
      // 1. Gather all unique request parameters from all imported specifications
      const allRequestFields: string[] = [];
      const specs = await this.specRepository.find();
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

      // 2. Gather all captured datasets & fields
      const datasets = await this.datasetRepository.find();
      const availableDatasets = datasets.map((d) => ({
        datasetName: d.datasetName,
        fields: d.detectedFields || [],
      }));

      // 3. Get AI suggestions using the IntelligenceService
      const suggestions = this.intelligenceService.suggestMappings(allRequestFields, availableDatasets);

      // 4. Save new mapping rules to database
      for (const suggestion of suggestions) {
        let mapping = await this.mappingRepository.findOneBy({
          sourceField: suggestion.paramName,
          datasetName: suggestion.suggestedDataset,
          targetField: suggestion.suggestedField,
        });

        if (!mapping) {
          mapping = new SmartMappingEntity();
          mapping.sourceField = suggestion.paramName;
          mapping.datasetName = suggestion.suggestedDataset;
          mapping.targetField = suggestion.suggestedField;
          mapping.userApproved = false; // defaults to pending
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
    @Body() body: { schema: Record<string, unknown>; endpointSummary?: string },
  ) {
    const ruleScenarios = this.scenarioService.generateRuleBasedScenarios(body.schema);
    const aiEnrichedPayload = await this.scenarioService.enrichPayloadWithLocalAI(
      body.schema,
      body.endpointSummary,
    );

    ruleScenarios.push({
      scenarioName: 'Local AI Domain Enriched Scenario',
      generationRule: 'ai_enriched',
      expectedResult: 'success',
      payload: aiEnrichedPayload,
    });

    return ruleScenarios;
  }

  @Post('delete-log')
  async deleteLog(@Body() body: { id: string }) {
    if (!body.id) {
      throw new BadRequestException('Log ID is required');
    }
    const result = await this.executionLogRepository.delete(body.id);
    return { success: true, affected: result.affected };
  }

  @Post('clear-endpoint-history')
  async clearEndpointHistory(@Body() body: { endpointPath: string; method: string }) {
    if (!body.endpointPath || !body.method) {
      throw new BadRequestException('endpointPath and method are required');
    }
    const result = await this.executionLogRepository.delete({
      endpointPath: body.endpointPath,
      httpMethod: body.method,
    });
    return { success: true, affected: result.affected };
  }
}
