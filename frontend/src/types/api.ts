export interface Endpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary: string;
  requestSchema?: any;
  parameters?: Array<{
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie' | 'body';
    required?: boolean;
    schema?: any;
  }>;
  baseUrl?: string;
}

export interface ParsedSpec {
  title: string;
  version: string;
  baseUrl: string;
  endpoints: Endpoint[];
}

export interface Scenario {
  id?: string;
  scenarioName: string;
  generationRule: string;
  expectedResult: string;
  payload: any;
  priority?: string;
  category?: string;
  description?: string;
  assertions?: string[];
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
}

export interface ExecutionResult {
  scenarioName: string;
  generationRule: string;
  statusCode: number;
  responseTimeMs: number;
  passed: boolean;
  schemaValid?: boolean;
  requestPayload: any;
  responseBody: any;
  aiExplanation?: string;
  aiModel?: string;
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
