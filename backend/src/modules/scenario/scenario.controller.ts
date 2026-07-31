import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedTestCaseEntity } from '../../entities/saved-test-case.entity';
import { ApiSpecEntity } from '../../entities/api-spec.entity';
import { ScenarioService } from './scenario.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('scenario')
@UseGuards(JwtAuthGuard)
export class ScenarioController {
  constructor(
    @InjectRepository(SavedTestCaseEntity)
    private readonly testCaseRepository: Repository<SavedTestCaseEntity>,
    @InjectRepository(ApiSpecEntity)
    private readonly apiSpecRepository: Repository<ApiSpecEntity>,
    private readonly scenarioService: ScenarioService,
  ) {}

  @Get('list')
  async listScenarios(
    @Query('endpointId') endpointId: string,
    @Query('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }

    // Verify ownership of workspace
    const workspace = await this.apiSpecRepository.findOne({
      where: { id: workspaceId, user: { id: req.user.userId } },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }

    return this.testCaseRepository.find({
      where: { endpointId, workspace: { id: workspaceId } },
      order: { createdAt: 'ASC' },
    });
  }

  @Post('save')
  async saveScenario(
    @Req() req: any,
    @Body()
    body: {
      workspaceId: string;
      endpointId: string;
      scenarioName: string;
      expectedResult: string;
      payload: Record<string, unknown>;
      generationRule?: string;
      priority?: string;
      category?: string;
      description?: string;
      assertions?: string[];
      pathParams?: Record<string, string>;
      queryParams?: Record<string, string>;
    },
  ) {
    if (!body.workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }

    // Verify ownership of workspace
    const workspace = await this.apiSpecRepository.findOne({
      where: { id: body.workspaceId, user: { id: req.user.userId } },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }

    let testCase = await this.testCaseRepository.findOne({
      where: {
        workspace: { id: body.workspaceId },
        endpointId: body.endpointId,
        scenarioName: body.scenarioName,
      },
    });

    if (!testCase) {
      testCase = new SavedTestCaseEntity();
      testCase.workspace = workspace;
      testCase.endpointId = body.endpointId;
      testCase.scenarioName = body.scenarioName;
    }

    testCase.expectedResult = body.expectedResult || '200 OK';
    testCase.payload = body.payload || {};
    testCase.generationRule = body.generationRule || 'manual';
    testCase.priority = body.priority;
    testCase.category = body.category;
    testCase.description = body.description;
    testCase.assertions = body.assertions;
    testCase.pathParams = body.pathParams;
    testCase.queryParams = body.queryParams;

    return this.testCaseRepository.save(testCase);
  }

  @Delete('delete/:id')
  async deleteScenario(@Param('id') id: string, @Req() req: any) {
    const testCase = await this.testCaseRepository.findOne({
      where: { id },
      relations: ['workspace', 'workspace.user'],
    });

    if (!testCase) {
      throw new NotFoundException('Scenario not found');
    }

    if (testCase.workspace?.user?.id !== req.user.userId) {
      throw new UnauthorizedException('Unauthorized to delete this scenario');
    }

    await this.testCaseRepository.remove(testCase);
    return { success: true };
  }
}
