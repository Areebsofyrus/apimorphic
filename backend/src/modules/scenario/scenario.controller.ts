import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedTestCaseEntity } from '../../entities/saved-test-case.entity';
import { ApiSpecEntity, EndpointSpec } from '../../entities/api-spec.entity';
import { ScenarioService } from './scenario.service';

@Controller('scenario')
export class ScenarioController {
  constructor(
    @InjectRepository(SavedTestCaseEntity)
    private readonly testCaseRepository: Repository<SavedTestCaseEntity>,
    @InjectRepository(ApiSpecEntity)
    private readonly apiSpecRepository: Repository<ApiSpecEntity>,
    private readonly scenarioService: ScenarioService,
  ) {}

  @Get('list')
  async listScenarios(@Query('endpointId') endpointId: string) {
    return this.testCaseRepository.find({
      where: { endpointId },
      order: { createdAt: 'ASC' },
    });
  }

  @Post('save')
  async saveScenario(
    @Body()
    body: {
      endpointId: string;
      scenarioName: string;
      expectedResult: string;
      payload: Record<string, unknown>;
      generationRule?: string;
    },
  ) {
    let testCase = await this.testCaseRepository.findOneBy({
      endpointId: body.endpointId,
      scenarioName: body.scenarioName,
    });

    if (!testCase) {
      testCase = new SavedTestCaseEntity();
      testCase.endpointId = body.endpointId;
      testCase.scenarioName = body.scenarioName;
    }

    testCase.expectedResult = body.expectedResult || '200 OK';
    testCase.payload = body.payload || {};
    testCase.generationRule = body.generationRule || 'manual';

    return this.testCaseRepository.save(testCase);
  }

  @Delete('delete/:id')
  async deleteScenario(@Param('id') id: string) {
    await this.testCaseRepository.delete(id);
    return { success: true };
  }
}
