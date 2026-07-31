import { Controller, Post, Body, Get, BadRequestException, NotFoundException, UseGuards, Req, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiSpecEntity, EndpointSpec } from '../../entities/api-spec.entity';
import { ParserService } from './parser.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import axios from 'axios';

@Controller('parser')
@UseGuards(JwtAuthGuard)
export class ParserController {
  constructor(
    private readonly parserService: ParserService,
    @InjectRepository(ApiSpecEntity)
    private readonly apiSpecRepository: Repository<ApiSpecEntity>,
  ) {}

  @Get('specs')
  async getSpecs(@Req() req: any) {
    return this.apiSpecRepository.find({
      where: { user: { id: req.user.userId } },
      order: { title: 'ASC' },
    });
  }

  @Post('swagger')
  async parseSwagger(@Req() req: any, @Body() body: { spec: string | Record<string, unknown> }) {
    const result = await this.parserService.parseSwagger(body.spec);

    let specEntity = await this.apiSpecRepository.findOne({
      where: { title: result.title, user: { id: req.user.userId } },
    });
    if (!specEntity) {
      specEntity = new ApiSpecEntity();
      specEntity.title = result.title;
      specEntity.user = { id: req.user.userId } as any;
    }
    specEntity.version = result.version;
    specEntity.sourceType = result.sourceType;
    specEntity.baseUrl = result.baseUrl;
    specEntity.endpoints = result.endpoints;
    specEntity.rawSpec = typeof body.spec === 'object' ? body.spec : undefined;

    await this.apiSpecRepository.save(specEntity);
    return specEntity;
  }

  @Post('postman')
  async parsePostman(@Req() req: any, @Body() body: { collection: Record<string, unknown> }) {
    const result = await this.parserService.parsePostmanCollection(body.collection);

    let specEntity = await this.apiSpecRepository.findOne({
      where: { title: result.title, user: { id: req.user.userId } },
    });
    if (!specEntity) {
      specEntity = new ApiSpecEntity();
      specEntity.title = result.title;
      specEntity.user = { id: req.user.userId } as any;
    }
    specEntity.version = result.version;
    specEntity.sourceType = result.sourceType;
    specEntity.endpoints = result.endpoints;
    specEntity.rawSpec = body.collection;

    await this.apiSpecRepository.save(specEntity);
    return specEntity;
  }

  @Post('swagger-url')
  async parseSwaggerUrl(@Req() req: any, @Body() body: { url: string }) {
    if (!body.url) {
      throw new BadRequestException('URL is required');
    }
    try {
      const response = await axios.get(body.url);
      const specData = response.data;
      const result = await this.parserService.parseSwagger(specData);

      let specEntity = await this.apiSpecRepository.findOne({
        where: { title: result.title, user: { id: req.user.userId } },
      });
      if (!specEntity) {
        specEntity = new ApiSpecEntity();
        specEntity.title = result.title;
        specEntity.user = { id: req.user.userId } as any;
      }
      specEntity.version = result.version;
      specEntity.sourceType = result.sourceType;
      specEntity.baseUrl = result.baseUrl;
      specEntity.endpoints = result.endpoints;
      specEntity.rawSpec = typeof specData === 'object' ? specData : undefined;
      specEntity.swaggerUrl = body.url;

      await this.apiSpecRepository.save(specEntity);
      return { success: true, result, id: specEntity.id };
    } catch (err: any) {
      throw new BadRequestException(`Failed to parse spec from URL: ${err.message}`);
    }
  }

  @Post('sync')
  async syncSwaggerSpec(@Req() req: any, @Body() body: { id: string }) {
    if (!body.id) {
      throw new BadRequestException('Workspace ID is required');
    }

    const specEntity = await this.apiSpecRepository.findOne({
      where: { id: body.id, user: { id: req.user.userId } },
    });
    if (!specEntity) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }

    if (!specEntity.swaggerUrl) {
      throw new BadRequestException('This workspace does not have a registered Swagger URL to sync from.');
    }

    try {
      const response = await axios.get(specEntity.swaggerUrl);
      const specData = response.data;
      const result = await this.parserService.parseSwagger(specData);

      // Detect endpoint changes
      const changes = this.parserService.detectEndpointChanges(
        specEntity.endpoints || [],
        result.endpoints || []
      );

      // Update workspace specs
      specEntity.version = result.version;
      specEntity.baseUrl = result.baseUrl;
      specEntity.endpoints = result.endpoints;
      specEntity.rawSpec = typeof specData === 'object' ? specData : undefined;

      await this.apiSpecRepository.save(specEntity);

      return {
        success: true,
        changes,
        message: `Synced workspace "${specEntity.title}" successfully. Added: ${changes.added.length}, Modified: ${changes.modified.length}, Removed: ${changes.removed.length}`,
      };
    } catch (err: any) {
      throw new BadRequestException(`Sync failed: ${err.message}`);
    }
  }

  @Post('update-base-url')
  async updateBaseUrl(@Req() req: any, @Body() body: { id: string; baseUrl: string }) {
    if (!body.id) {
      throw new BadRequestException('Workspace ID is required');
    }
    const spec = await this.apiSpecRepository.findOne({
      where: { id: body.id, user: { id: req.user.userId } },
    });
    if (!spec) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }
    spec.baseUrl = body.baseUrl;
    await this.apiSpecRepository.save(spec);
    return { success: true };
  }

  @Post('link-url')
  async linkUrl(@Req() req: any, @Body() body: { id: string; url: string }) {
    if (!body.id || !body.url) {
      throw new BadRequestException('ID and URL are required');
    }
    const spec = await this.apiSpecRepository.findOne({
      where: { id: body.id, user: { id: req.user.userId } },
    });
    if (!spec) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }
    
    // Validate the URL
    try {
      const response = await axios.get(body.url);
      const specData = response.data;
      await this.parserService.parseSwagger(specData);
    } catch (err: any) {
      throw new BadRequestException(`Failed to validate Swagger URL: ${err.message}`);
    }

    spec.swaggerUrl = body.url;
    await this.apiSpecRepository.save(spec);
    return { success: true };
  }

  @Post('delete-workspace')
  async deleteWorkspace(@Req() req: any, @Body() body: { id: string }) {
    if (!body.id) {
      throw new BadRequestException('Workspace ID is required');
    }
    const spec = await this.apiSpecRepository.findOne({
      where: { id: body.id, user: { id: req.user.userId } },
    });
    if (!spec) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }
    await this.apiSpecRepository.remove(spec);
    return { success: true };
  }

  @Post('workspace/:id/profiles')
  async saveProfiles(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { profiles: any[]; activeProfileName: string; globalVariables?: Record<string, string> },
  ) {
    const spec = await this.apiSpecRepository.findOne({
      where: { id, user: { id: req.user.userId } },
    });
    if (!spec) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }
    spec.profiles = body.profiles || [];
    spec.activeProfileName = body.activeProfileName || '';
    if (body.globalVariables !== undefined) {
      spec.globalVariables = body.globalVariables;
    }
    await this.apiSpecRepository.save(spec);
    return { success: true };
  }

  @Post('workspace/:id/env-config')
  async saveEnvConfig(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    const spec = await this.apiSpecRepository.findOne({
      where: { id, user: { id: req.user.userId } },
    });
    if (!spec) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }
    spec.baseUrl = body.baseUrl;
    spec.authToken = body.authToken;
    spec.customHeaders = body.customHeaders;
    spec.preMethod = body.preMethod;
    spec.preEndpoint = body.preEndpoint;
    spec.prePayload = body.prePayload;
    spec.preExtractKey = body.preExtractKey;
    spec.runPreEverytime = body.runPreEverytime ?? false;
    spec.showSettings = body.showSettings ?? false;
    await this.apiSpecRepository.save(spec);
    return { success: true };
  }

  @Post('detect-changes')
  async detectChanges(@Body() body: { oldEndpoints: EndpointSpec[]; newEndpoints: EndpointSpec[] }) {
    return this.parserService.detectEndpointChanges(body.oldEndpoints || [], body.newEndpoints || []);
  }
}
