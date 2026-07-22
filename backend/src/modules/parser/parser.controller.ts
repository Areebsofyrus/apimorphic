import { Controller, Post, Body, Get, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiSpecEntity, EndpointSpec } from '../../entities/api-spec.entity';
import { ParserService } from './parser.service';
import axios from 'axios';

@Controller('parser')
export class ParserController {
  constructor(
    private readonly parserService: ParserService,
    @InjectRepository(ApiSpecEntity)
    private readonly apiSpecRepository: Repository<ApiSpecEntity>,
  ) {}

  @Get('specs')
  async getSpecs() {
    return this.apiSpecRepository.find();
  }

  @Post('swagger')
  async parseSwagger(@Body() body: { spec: string | Record<string, unknown> }) {
    const result = await this.parserService.parseSwagger(body.spec);

    let specEntity = await this.apiSpecRepository.findOneBy({ title: result.title });
    if (!specEntity) {
      specEntity = new ApiSpecEntity();
      specEntity.title = result.title;
    }
    specEntity.version = result.version;
    specEntity.sourceType = result.sourceType;
    specEntity.baseUrl = result.baseUrl;
    specEntity.endpoints = result.endpoints;
    specEntity.rawSpec = typeof body.spec === 'object' ? body.spec : undefined;

    await this.apiSpecRepository.save(specEntity);
    return result;
  }

  @Post('postman')
  async parsePostman(@Body() body: { collection: Record<string, unknown> }) {
    const result = await this.parserService.parsePostmanCollection(body.collection);

    let specEntity = await this.apiSpecRepository.findOneBy({ title: result.title });
    if (!specEntity) {
      specEntity = new ApiSpecEntity();
      specEntity.title = result.title;
    }
    specEntity.version = result.version;
    specEntity.sourceType = result.sourceType;
    specEntity.endpoints = result.endpoints;
    specEntity.rawSpec = body.collection;

    await this.apiSpecRepository.save(specEntity);
    return result;
  }

  @Post('swagger-url')
  async parseSwaggerUrl(@Body() body: { url: string }) {
    if (!body.url) {
      throw new BadRequestException('URL is required');
    }
    try {
      const response = await axios.get(body.url);
      const specData = response.data;
      const result = await this.parserService.parseSwagger(specData);

      let specEntity = await this.apiSpecRepository.findOneBy({ title: result.title });
      if (!specEntity) {
        specEntity = new ApiSpecEntity();
        specEntity.title = result.title;
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
  async syncSwaggerSpec(@Body() body: { id: string }) {
    if (!body.id) {
      throw new BadRequestException('Workspace ID is required');
    }

    const specEntity = await this.apiSpecRepository.findOneBy({ id: body.id });
    if (!specEntity) {
      throw new NotFoundException('Workspace not found');
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
  async updateBaseUrl(@Body() body: { id: string; baseUrl: string }) {
    if (!body.id) {
      throw new BadRequestException('Workspace ID is required');
    }
    const spec = await this.apiSpecRepository.findOneBy({ id: body.id });
    if (!spec) {
      throw new NotFoundException('Workspace not found');
    }
    spec.baseUrl = body.baseUrl;
    await this.apiSpecRepository.save(spec);
    return { success: true };
  }

  @Post('link-url')
  async linkUrl(@Body() body: { id: string; url: string }) {
    if (!body.id || !body.url) {
      throw new BadRequestException('ID and URL are required');
    }
    const spec = await this.apiSpecRepository.findOneBy({ id: body.id });
    if (!spec) {
      throw new NotFoundException('Workspace not found');
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
  async deleteWorkspace(@Body() body: { id: string }) {
    if (!body.id) {
      throw new BadRequestException('Workspace ID is required');
    }
    const result = await this.apiSpecRepository.delete(body.id);
    return { success: true, affected: result.affected };
  }

  @Post('detect-changes')
  async detectChanges(@Body() body: { oldEndpoints: EndpointSpec[]; newEndpoints: EndpointSpec[] }) {
    return this.parserService.detectEndpointChanges(body.oldEndpoints || [], body.newEndpoints || []);
  }
}
