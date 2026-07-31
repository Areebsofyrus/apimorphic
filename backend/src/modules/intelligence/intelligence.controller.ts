import { Controller, Get, Post, Body, UseGuards, Req, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmartMappingEntity } from '../../entities/smart-mapping.entity';
import { ApiSpecEntity } from '../../entities/api-spec.entity';
import { IntelligenceService } from './intelligence.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('intelligence')
@UseGuards(JwtAuthGuard)
export class IntelligenceController {
  constructor(
    private readonly intelligenceService: IntelligenceService,
    @InjectRepository(SmartMappingEntity)
    private readonly mappingRepository: Repository<SmartMappingEntity>,
    @InjectRepository(ApiSpecEntity)
    private readonly specRepository: Repository<ApiSpecEntity>,
  ) {}

  @Get('mappings')
  async getMappings(@Req() req: any) {
    const list = await this.mappingRepository.find({
      where: { user: { id: req.user.userId } },
    });
    return list.map((m) => ({
      id: m.id,
      sourceField: m.sourceField,
      targetMapping: `${m.datasetName}.${m.targetField}`,
      confidence: 0.95,
      status: m.userApproved ? ('approved' as const) : ('pending' as const),
    }));
  }

  @Get('request-fields')
  async getRequestFields(@Req() req: any) {
    try {
      const specs = await this.specRepository.find({
        where: { user: { id: req.user.userId } },
      });
      const fields: string[] = [];
      specs.forEach((spec) => {
        if (spec.endpoints) {
          spec.endpoints.forEach((ep) => {
            if (ep.requestSchema && ep.requestSchema.properties) {
              Object.keys(ep.requestSchema.properties).forEach((k) => {
                if (!fields.includes(k)) {
                  fields.push(k);
                }
              });
            }
          });
        }
      });
      return fields;
    } catch {
      return [];
    }
  }

  @Post('approve')
  async approveMapping(@Req() req: any, @Body() body: { id: string; status: 'approved' | 'rejected' | 'pending' }) {
    const mapping = await this.mappingRepository.findOne({
      where: { id: body.id, user: { id: req.user.userId } },
    });
    if (!mapping) {
      throw new NotFoundException('Mapping rule not found or unauthorized');
    }
    mapping.userApproved = body.status === 'approved';
    await this.mappingRepository.save(mapping);
    return { success: true };
  }

  @Post('create')
  async createMapping(@Req() req: any, @Body() body: { sourceField: string; datasetName: string; targetField: string }) {
    let mapping = await this.mappingRepository.findOne({
      where: {
        sourceField: body.sourceField,
        datasetName: body.datasetName,
        targetField: body.targetField,
        user: { id: req.user.userId },
      },
    });
    if (!mapping) {
      mapping = new SmartMappingEntity();
      mapping.sourceField = body.sourceField;
      mapping.datasetName = body.datasetName;
      mapping.targetField = body.targetField;
      mapping.user = { id: req.user.userId } as any;
    }
    mapping.userApproved = true; // Manually created mapping is automatically approved
    await this.mappingRepository.save(mapping);
    return {
      id: mapping.id,
      sourceField: mapping.sourceField,
      targetMapping: `${mapping.datasetName}.${mapping.targetField}`,
      confidence: 1.0,
      status: 'approved' as const,
    };
  }

  @Post('delete')
  async deleteMapping(@Req() req: any, @Body() body: { id: string }) {
    const mapping = await this.mappingRepository.findOne({
      where: { id: body.id, user: { id: req.user.userId } },
    });
    if (!mapping) {
      throw new NotFoundException('Mapping rule not found or unauthorized');
    }
    await this.mappingRepository.remove(mapping);
    return { success: true };
  }
}
