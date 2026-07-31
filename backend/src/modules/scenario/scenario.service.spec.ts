import { ScenarioService } from './scenario.service';
import { Repository } from 'typeorm';
import { StoredDatasetEntity } from '../../entities/stored-dataset.entity';
import { SmartMappingEntity } from '../../entities/smart-mapping.entity';

describe('ScenarioService', () => {
  let service: ScenarioService;
  let mockDatasetRepository: jest.Mocked<Repository<StoredDatasetEntity>>;
  let mockMappingRepository: jest.Mocked<Repository<SmartMappingEntity>>;

  beforeEach(() => {
    mockDatasetRepository = {
      find: jest.fn().mockResolvedValue([]),
    } as any;

    mockMappingRepository = {
      findBy: jest.fn().mockResolvedValue([]),
    } as any;

    service = new ScenarioService(mockDatasetRepository, mockMappingRepository);
  });

  it('should generate deterministic rule-based scenarios', async () => {
    const sampleSchema = {
      type: 'object',
      properties: {
        username: { type: 'string' },
        age: { type: 'number' },
      },
    };

    const scenarios = await service.generateRuleBasedScenarios(sampleSchema, '/login', 'POST');
    expect(scenarios.length).toBeGreaterThan(5);
    
    const validScenario = scenarios.find((s) => s.generationRule === 'valid');
    expect(validScenario).toBeDefined();

    const sqliScenario = scenarios.find((s) => s.generationRule === 'security-sqli');
    expect(sqliScenario).toBeDefined();
    expect(sqliScenario?.payload.username).toContain("' OR '1'='1' --");
  });
});
