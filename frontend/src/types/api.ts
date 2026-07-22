export interface Endpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary: string;
  requestSchema?: any;
}

export interface ParsedSpec {
  title: string;
  version: string;
  baseUrl: string;
  endpoints: Endpoint[];
}

export interface Scenario {
  scenarioName: string;
  generationRule: string;
  expectedResult: string;
  payload: any;
}

export interface ExecutionResult {
  scenarioName: string;
  generationRule: string;
  statusCode: number;
  responseTimeMs: number;
  passed: boolean;
  schemaValid: boolean;
  requestPayload: any;
  responseBody: any;
  aiExplanation?: string;
}

export interface DatasetRow {
  [key: string]: any;
}

export interface MappingRule {
  id: string;
  sourceField: string;
  targetMapping: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface TestRunHistory {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  totalTests: number;
  passed: number;
  failed: number;
}
