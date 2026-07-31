import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoredDatasetEntity } from '../../entities/stored-dataset.entity';
import { DatasetService } from './dataset.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dataset')
@UseGuards(JwtAuthGuard)
export class DatasetController {
  constructor(
    private readonly datasetService: DatasetService,
    @InjectRepository(StoredDatasetEntity)
    private readonly datasetRepository: Repository<StoredDatasetEntity>,
  ) {}

  @Get()
  async getDatasets(@Req() req: any) {
    const list = await this.datasetRepository.find({
      where: { user: { id: req.user.userId } },
    });
    return list.map((d) => ({
      datasetName: d.datasetName,
      sourceEndpoint: d.sourceEndpoint,
      fields: d.detectedFields,
      records: d.records,
    }));
  }

  @Post('detect')
  async detectAndStore(
    @Req() req: any,
    @Body() body: { responseBody: any; datasetName: string; sourceEndpoint: string },
  ) {
    const result = this.datasetService.detectCollection(body.responseBody);
    if (result.isCollection) {
      let dataset = await this.datasetRepository.findOne({
        where: { datasetName: body.datasetName, user: { id: req.user.userId } },
      });
      if (!dataset) {
        dataset = new StoredDatasetEntity();
        dataset.datasetName = body.datasetName;
        dataset.user = { id: req.user.userId } as any;
      }
      dataset.sourceEndpoint = body.sourceEndpoint;
      dataset.detectedFields = this.flattenKeys(result.records[0] || {});
      dataset.records = result.records;
      dataset.totalRecords = result.records.length;

      const saved = await this.datasetRepository.save(dataset);
      return { success: true, dataset: saved };
    }
    return { success: false, message: 'Response is not a collection' };
  }

  private flattenKeys(obj: any, prefix = ''): string[] {
    if (typeof obj !== 'object' || obj === null) {
      return [];
    }
    const keys: string[] = [];
    Object.keys(obj).forEach((key) => {
      const val = obj[key];
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'object' && val !== null) {
        if (Array.isArray(val)) {
          const firstItem = val[0];
          if (typeof firstItem === 'object' && firstItem !== null) {
            keys.push(newPrefix);
            keys.push(...this.flattenKeys(firstItem, newPrefix));
          } else {
            keys.push(newPrefix);
          }
        } else {
          keys.push(newPrefix);
          keys.push(...this.flattenKeys(val, newPrefix));
        }
      } else {
        keys.push(newPrefix);
      }
    });
    return keys;
  }
}
