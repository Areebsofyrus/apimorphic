import { ScenarioService } from './scenario.service';

describe('ScenarioService', () => {
  let service: ScenarioService;

  beforeEach(() => {
    service = new ScenarioService();
  });

  it('should generate deterministic rule-based scenarios (valid, null, empty, sqli, xss)', () => {
    const sampleSchema = {
      type: 'object',
      properties: {
        username: { type: 'string' },
        age: { type: 'number' },
      },
    };

    const scenarios = service.generateRuleBasedScenarios(sampleSchema);
    expect(scenarios.length).toBe(5);
    expect(scenarios[0].generationRule).toBe('valid');
    expect(scenarios[3].generationRule).toBe('sql_injection');
    expect(scenarios[4].generationRule).toBe('xss');
    expect(scenarios[3].payload.username).toContain("' OR '1'='1'");
  });
});
