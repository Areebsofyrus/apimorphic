import { Injectable } from '@nestjs/common';
import axios from 'axios';
import Ajv from 'ajv';
import pLimit from 'p-limit';
import { AiAnalyzerService } from '../ai-analyzer/ai-analyzer.service';

export interface ExecutionRequest {
  baseUrl: string;
  endpoint: string;
  method: string;
  headers?: Record<string, string>;
  payload?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  scenarioName?: string;
  generationRule?: string;
  expectedResult?: string;
  prerequisites?: Array<{
    method: string;
    endpoint: string;
    payload?: Record<string, unknown>;
    extractVariableKey?: string;
  }>;
  geminiApiKey?: string;
}

export interface ExecutionResponse {
  scenarioName: string;
  generationRule: string;
  statusCode: number;
  responseTimeMs: number;
  passed: boolean;
  schemaValid: boolean;
  requestPayload: Record<string, unknown>;
  responseBody: Record<string, unknown>;
  aiExplanation?: string;
  aiModel?: string;
}

function isStatusMatchingExpected(actualStatus: number, expected: string | undefined): boolean {
  if (!expected) {
    return actualStatus >= 200 && actualStatus < 300;
  }
  
  // Find any 3-digit status code (e.g. 401, 400, 200) in the expected result string
  const statusMatch = expected.match(/\b\d{3}\b/);
  if (statusMatch) {
    const expectedCode = parseInt(statusMatch[0], 10);
    return actualStatus === expectedCode;
  }

  const normalized = expected.toLowerCase();
  if (normalized.includes('success') || normalized.includes('ok') || normalized.includes('2xx')) {
    return actualStatus >= 200 && actualStatus < 300;
  }
  if (normalized.includes('fail') || normalized.includes('error') || normalized.includes('invalid') || normalized.includes('bad')) {
    return actualStatus >= 400;
  }
  if (normalized.includes('unauthorized') || normalized.includes('auth')) {
    return actualStatus === 401 || actualStatus === 403;
  }

  return actualStatus >= 200 && actualStatus < 300;
}

@Injectable()
export class RunnerService {
  private ajv = new Ajv({ allErrors: true, coerceTypes: true });

  constructor(private readonly aiAnalyzerService: AiAnalyzerService) {}

  async executeTest(req: ExecutionRequest): Promise<ExecutionResponse> {
    const startTime = Date.now();
    const dynamicHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...(req.headers || {}) };
    const fullUrl = `${req.baseUrl.replace(/\/$/, '')}${req.endpoint}`;
    const scenarioName = req.scenarioName || 'Default Scenario';
    const generationRule = req.generationRule || 'manual';

    // 1. Run Prerequisites if present
    if (req.prerequisites && req.prerequisites.length > 0) {
      for (const pre of req.prerequisites) {
        try {
          const preUrl = `${req.baseUrl.replace(/\/$/, '')}${pre.endpoint}`;
          const preRes = await axios({
            method: pre.method,
            url: preUrl,
            headers: { 'Content-Type': 'application/json' },
            data: pre.payload,
          });

          // Extract token from response body if key is provided
          if (pre.extractVariableKey && preRes.data) {
            const token = preRes.data[pre.extractVariableKey] || 
                          (preRes.data.data && preRes.data.data[pre.extractVariableKey]);
            if (token) {
              dynamicHeaders['Authorization'] = `Bearer ${token}`;
            }
          }
        } catch (err: any) {
          console.warn(`Prerequisite call to ${pre.endpoint} failed: ${err.message}`);
        }
      }
    }

    // 2. Run Main Target API
    try {
      console.log(`[RunnerService] Executing target: ${req.method} ${fullUrl}`);
      console.log(`[RunnerService] Headers:`, JSON.stringify(dynamicHeaders, null, 2));
      console.log(`[RunnerService] Payload:`, JSON.stringify(req.payload || {}, null, 2));
      const response = await axios({
        method: req.method,
        url: fullUrl,
        headers: dynamicHeaders,
        data: req.payload,
        timeout: 10000,
      });

      const responseTimeMs = Date.now() - startTime;
      const responseBody = typeof response.data === 'object' ? response.data : { raw: response.data };

      // Validate Schema
      let schemaValid = true;
      if (req.responseSchema) {
        try {
          const validate = this.ajv.compile(req.responseSchema);
          schemaValid = !!validate(responseBody);
        } catch {
          schemaValid = true;
        }
      }

      const matchedExpectation = isStatusMatchingExpected(response.status, req.expectedResult);
      const passed = matchedExpectation && schemaValid;

      let aiExplanation: string | undefined = undefined;
      let aiModel: string | undefined = undefined;

      if (!passed) {
        aiExplanation = await this.aiAnalyzerService.analyzeFailure({
          endpoint: req.endpoint,
          method: req.method,
          scenarioName,
          statusCode: response.status,
          requestPayload: req.payload || {},
          responseBody,
        }, req.geminiApiKey);
        aiModel = await this.aiAnalyzerService.getActiveModelName(req.geminiApiKey);
      }

      return {
        scenarioName,
        generationRule,
        statusCode: response.status,
        responseTimeMs,
        passed,
        schemaValid,
        requestPayload: req.payload || {},
        responseBody,
        aiExplanation,
        aiModel,
      };
    } catch (error: any) {
      console.error('[RunnerService] Axios execution error:', error.message);
      if (error.response) {
        console.error('[RunnerService] Response status:', error.response.status);
        console.error('[RunnerService] Response body:', JSON.stringify(error.response.data, null, 2));
      }
      const responseTimeMs = Date.now() - startTime;
      const statusCode = error.response?.status || 500;
      const responseBody = error.response?.data || { error: error.message };

      const matchedExpectation = isStatusMatchingExpected(statusCode, req.expectedResult);

      let aiExplanation: string | undefined = undefined;
      let aiModel: string | undefined = undefined;

      if (!matchedExpectation) {
        aiExplanation = await this.aiAnalyzerService.analyzeFailure({
          endpoint: req.endpoint,
          method: req.method,
          scenarioName,
          statusCode,
          requestPayload: req.payload || {},
          responseBody,
        }, req.geminiApiKey);
        aiModel = await this.aiAnalyzerService.getActiveModelName(req.geminiApiKey);
      }

      return {
        scenarioName,
        generationRule,
        statusCode,
        responseTimeMs,
        passed: matchedExpectation,
        schemaValid: matchedExpectation,
        requestPayload: req.payload || {},
        responseBody,
        aiExplanation,
        aiModel,
      };
    }
  }

  async executeSuiteConcurrently(requests: ExecutionRequest[], concurrency = 3): Promise<ExecutionResponse[]> {
    const limit = pLimit(concurrency);
    const tasks = requests.map((req) => limit(() => this.executeTest(req)));
    return Promise.all(tasks);
  }
  async getActiveModel(geminiApiKey?: string): Promise<string> {
    return this.aiAnalyzerService.getActiveModelName(geminiApiKey);
  }
}
