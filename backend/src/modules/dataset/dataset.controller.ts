import { Controller, Get, Post, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoredDatasetEntity } from '../../entities/stored-dataset.entity';
import { DatasetService } from './dataset.service';

@Controller('dataset')
export class DatasetController {
  constructor(
    private readonly datasetService: DatasetService,
    @InjectRepository(StoredDatasetEntity)
    private readonly datasetRepository: Repository<StoredDatasetEntity>,
  ) {}

  @Get()
  async getDatasets() {
    const list = await this.datasetRepository.find();
    return list.map((d) => ({
      datasetName: d.datasetName,
      sourceEndpoint: d.sourceEndpoint,
      fields: d.detectedFields,
      records: d.records,
    }));
  }

  @Post('detect')
  async detectAndStore(@Body() body: { responseBody: any; datasetName: string; sourceEndpoint: string }) {
    const result = this.datasetService.detectCollection(body.responseBody);
    if (result.isCollection) {
      let dataset = await this.datasetRepository.findOneBy({ datasetName: body.datasetName });
      if (!dataset) {
        dataset = new StoredDatasetEntity();
        dataset.datasetName = body.datasetName;
      }
      dataset.sourceEndpoint = body.sourceEndpoint;
      dataset.detectedFields = Object.keys(result.records[0] || {});
      dataset.records = result.records;
      dataset.totalRecords = result.records.length;

      const saved = await this.datasetRepository.save(dataset);
      return { success: true, dataset: saved };
    }
    return { success: false, message: 'Response is not a collection' };
  }
}
