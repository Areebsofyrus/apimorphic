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

  it('should generate scenarios targeting parameters for payload-less endpoints', async () => {
    const emptySchema = {
      type: 'object',
      properties: {},
    };

    const parameters: any[] = [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
      { name: 'search', in: 'query', required: true, schema: { type: 'string' } },
    ];

    const scenarios = await service.generateRuleBasedScenarios(emptySchema, '/users/:id', 'GET', parameters);
    
    // Check that we got a valid scenario with query parameters and path parameters
    const validScenario = scenarios.find((s) => s.generationRule === 'valid');
    expect(validScenario).toBeDefined();
    expect(validScenario?.queryParams?.search).toBeDefined();
    expect(validScenario?.pathParams?.id).toBeDefined();

    // Check missing required query param
    const missingQueryScenario = scenarios.find((s) => s.scenarioName.includes('Missing Required Query Param'));
    expect(missingQueryScenario).toBeDefined();
    expect(missingQueryScenario?.queryParams?.search).toBeUndefined();

    // Check SQL Injection in Query params
    const sqliScenario = scenarios.find((s) => s.generationRule === 'security-sqli');
    expect(sqliScenario).toBeDefined();
    expect(sqliScenario?.queryParams?.search).toContain("' OR '1'='1' --");
  });

  it('should generate recursive nested objects and array elements in payloads', async () => {
    const nestedSchema = {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          properties: {
            fullName: { type: 'string' },
            rating: { type: 'number' },
          },
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string' },
              quantity: { type: 'number' },
            },
          },
        },
      },
    };

    const scenarios = await service.generateRuleBasedScenarios(nestedSchema, '/order', 'POST');
    const valid = scenarios.find((s) => s.generationRule === 'valid');
    expect(valid).toBeDefined();

    const payload: any = valid?.payload;
    expect(payload.profile).toBeDefined();
    expect(typeof payload.profile.fullName).toBe('string');
    expect(typeof payload.profile.rating).toBe('number');

    expect(Array.isArray(payload.tags)).toBe(true);
    expect(payload.tags.length).toBeGreaterThan(0);
    expect(typeof payload.tags[0]).toBe('string');

    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items.length).toBeGreaterThan(0);
    expect(typeof payload.items[0].itemId).toBe('string');
    expect(typeof payload.items[0].quantity).toBe('number');
  });
});
