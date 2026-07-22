import { RunnerService } from './runner.service';
import { AiAnalyzerService } from '../ai-analyzer/ai-analyzer.service';

describe('RunnerService', () => {
  let service: RunnerService;
  let aiAnalyzer: AiAnalyzerService;

  beforeEach(() => {
    aiAnalyzer = new AiAnalyzerService();
    service = new RunnerService(aiAnalyzer);
  });

  it('should initialize RunnerService cleanly', () => {
    expect(service).toBeDefined();
  });
});
