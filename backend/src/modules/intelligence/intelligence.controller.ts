import { Controller, Get, Post, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmartMappingEntity } from '../../entities/smart-mapping.entity';
import { IntelligenceService } from './intelligence.service';

@Controller('intelligence')
export class IntelligenceController {
  constructor(
    private readonly intelligenceService: IntelligenceService,
    @InjectRepository(SmartMappingEntity)
    private readonly mappingRepository: Repository<SmartMappingEntity>,
  ) {}

  @Get('mappings')
  async getMappings() {
    const list = await this.mappingRepository.find();
    return list.map((m) => ({
      id: m.id,
      sourceField: m.sourceField,
      targetMapping: `${m.datasetName}.${m.targetField}`,
      confidence: 0.95,
      status: m.userApproved ? 'approved' as const : 'pending' as const,
    }));
  }

  @Post('approve')
  async approveMapping(@Body() body: { id: string; status: 'approved' | 'rejected' }) {
    const mapping = await this.mappingRepository.findOneBy({ id: body.id });
    if (mapping) {
      mapping.userApproved = body.status === 'approved';
      await this.mappingRepository.save(mapping);
    }
    return { success: true };
  }
}
