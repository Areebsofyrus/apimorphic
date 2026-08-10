import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { StoredDatasetEntity } from '../../entities/stored-dataset.entity';
import { SmartMappingEntity } from '../../entities/smart-mapping.entity';

export interface GeneratedScenario {
  scenarioName: string;
  generationRule: string;
  expectedResult: string;
  payload: Record<string, unknown>;
  priority?: string;
  category?: string;
  description?: string;
  assertions?: string[];
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
}

@Injectable()
export class ScenarioService {
  private readonly logger = new Logger(ScenarioService.name);
  private openaiClient?: OpenAI;

  constructor(
    @InjectRepository(StoredDatasetEntity)
    private readonly datasetRepository: Repository<StoredDatasetEntity>,
    @InjectRepository(SmartMappingEntity)
    private readonly mappingRepository: Repository<SmartMappingEntity>,
  ) {}

  async getClientAndModel(geminiApiKey?: string): Promise<{ client: OpenAI; model: string }> {
    const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const client = new OpenAI({
          apiKey,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
        });
        // Test key validity
        await client.models.list();
        return {
          client,
          model: 'gemini-2.5-flash',
        };
      } catch (err: any) {
        this.logger.warn(`Gemini API key validation failed: ${err.message}. Falling back to local AI.`);
      }
    }

    const baseURL = process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1';
    const client = new OpenAI({
      baseURL,
      apiKey: 'local-ai-key',
    });
    
    const configuredModel = process.env.LOCAL_AI_MODEL || 'unsloth/gemma-4-E2B-it-GGUF';
    try {
      const list = await client.models.list();
      const availableModels = list.data.map((m) => m.id);
      if (availableModels.includes(configuredModel)) {
        return { client, model: configuredModel };
      }
      const matched = availableModels.find(
        (m) =>
          m.toLowerCase().includes('gemma') ||
          m.toLowerCase().includes(configuredModel.toLowerCase())
      );
      if (matched) return { client, model: matched };
      if (availableModels.length > 0) {
        return { client, model: availableModels[0] };
      }
    } catch {
      // Fallback
    }
    return { client, model: configuredModel };
  }

  private async getActiveModelName(geminiApiKey?: string): Promise<string> {
    const { model } = await this.getClientAndModel(geminiApiKey);
    return model;
  }

  private getEndpointCategory(path: string, method: string): 'auth' | 'read' | 'write' | 'delete' | 'generic' {
    const lowerPath = path.toLowerCase();
    const lowerMethod = method.toLowerCase();

    if (
      lowerPath.includes('login') ||
      lowerPath.includes('token') ||
      lowerPath.includes('auth') ||
      lowerPath.includes('signin') ||
      lowerPath.includes('signup') ||
      lowerPath.includes('password') ||
      lowerPath.includes('credential') ||
      lowerPath.includes('otp') ||
      lowerPath.includes('forgot') ||
      lowerPath.includes('reset') ||
      lowerPath.includes('logout')
    ) {
      return 'auth';
    }
    if (lowerMethod === 'get') {
      return 'read';
    }
    if (lowerMethod === 'post' || lowerMethod === 'put' || lowerMethod === 'patch') {
      return 'write';
    }
    if (lowerMethod === 'delete') {
      return 'delete';
    }
    return 'generic';
  }

  private generatePrimitive(itemSchema: any, key: string, forceRandom: boolean): any {
    const useExample = itemSchema.example !== undefined && !forceRandom;
    if (itemSchema.type === 'string') {
      return useExample ? itemSchema.example : `${key}_item_${Math.floor(Math.random() * 1000)}`;
    }
    if (itemSchema.type === 'number' || itemSchema.type === 'integer') {
      return useExample ? itemSchema.example : Math.floor(Math.random() * 90 + 10);
    }
    if (itemSchema.type === 'boolean') {
      return Math.random() > 0.5;
    }
    return `${key}_item`;
  }

  private generateValueForParamSchema(paramSchema: Record<string, any> | undefined, name: string): string {
    if (!paramSchema) {
      if (name.toLowerCase().includes('id')) {
        return `id_${Math.random().toString(36).substr(2, 9)}`;
      }
      return `${name}_val`;
    }
    if (paramSchema.example !== undefined) return String(paramSchema.example);
    if (paramSchema.default !== undefined) return String(paramSchema.default);
    
    const type = paramSchema.type;
    if (type === 'string') {
      if (name.toLowerCase().includes('email') || name.toLowerCase().includes('mail')) {
        return `user_${Math.floor(Math.random() * 9000 + 1000)}@example.com`;
      }
      if (name.toLowerCase().includes('id')) {
        return `id_${Math.random().toString(36).substr(2, 9)}`;
      }
      return `${name}_val`;
    }
    if (type === 'number' || type === 'integer') {
      return String(Math.floor(Math.random() * 90 + 10));
    }
    if (type === 'boolean') {
      return Math.random() > 0.5 ? 'true' : 'false';
    }
    return `${name}_val`;
  }

  private async injectDatasetValues(
    schema: Record<string, unknown>,
    forceRandom = false
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {};
    const properties = (schema.properties as Record<string, any>) || {};

    // 1. Fetch approved mapping rules and datasets
    const approvedMappings: SmartMappingEntity[] = await this.mappingRepository.findBy({ userApproved: true }).catch(() => []);
    const datasets: StoredDatasetEntity[] = await this.datasetRepository.find().catch(() => []);

    for (const [key, prop] of Object.entries(properties)) {
      let injectedValue: unknown = undefined;

      if (!forceRandom) {
        // Try mapped dataset first
        const mapping = approvedMappings.find((m: SmartMappingEntity) => m.sourceField === key);
        if (mapping) {
          const dataset = datasets.find((d: StoredDatasetEntity) => d.datasetName === mapping.datasetName);
          if (dataset && dataset.records && dataset.records.length > 0) {
            const record = dataset.records[Math.floor(Math.random() * dataset.records.length)];
            const val = this.getNestedValue(record, mapping.targetField);
            if (val !== undefined) {
              injectedValue = val;
              this.logger.log(`[ScenarioService] Injected mapped dataset value for key "${key}": ${injectedValue}`);
            }
          }
        }

        // Fallback: Name-based fuzzy lookup if no mapping is found
        if (injectedValue === undefined) {
          const matchedDataset = datasets.find((d: StoredDatasetEntity) => {
            const hasMatch = (d.detectedFields || []).some((f: string) => this.isFieldMatch(f, key));
            return hasMatch && d.records && d.records.length > 0;
          });

          if (matchedDataset) {
            const field = (matchedDataset.detectedFields || []).find((f: string) => this.isFieldMatch(f, key));
            if (field) {
              const record = matchedDataset.records[Math.floor(Math.random() * matchedDataset.records.length)];
              const val = this.getNestedValue(record, field);
              if (val !== undefined) {
                injectedValue = val;
                this.logger.log(`[ScenarioService] Injected fuzzy matched dataset value for key "${key}": ${injectedValue}`);
              }
            }
          }
        }
      }

      // If no dataset value was injected, fallback to standard mock generation logic
      if (injectedValue !== undefined) {
        payload[key] = injectedValue;
      } else {
        const useExample = prop.example !== undefined && !forceRandom;

        if (prop.type === 'string') {
          if (useExample) {
            payload[key] = prop.example;
          } else if (key.toLowerCase().includes('email') || key.toLowerCase().includes('mail')) {
            payload[key] = `user_${Math.floor(Math.random() * 9000 + 1000)}@example.com`;
          } else if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) {
            payload[key] = `+1-555-${Math.floor(Math.random() * 9000000 + 1000000)}`;
          } else if (key.toLowerCase().includes('id') || key.toLowerCase().includes('uuid')) {
            payload[key] = `id_${Math.random().toString(36).substr(2, 9)}`;
          } else {
            payload[key] = `${key}_val_${Math.floor(Math.random() * 1000)}`;
          }
        } else if (prop.type === 'number' || prop.type === 'integer') {
          if (useExample) {
            payload[key] = prop.example;
          } else {
            payload[key] = Math.floor(Math.random() * 90 + 10);
          }
        } else if (prop.type === 'boolean') {
          payload[key] = Math.random() > 0.5;
        } else if (prop.type === 'array') {
          if (prop.items && typeof prop.items === 'object') {
            if (prop.items.type === 'object') {
              payload[key] = [await this.injectDatasetValues(prop.items, forceRandom)];
            } else {
              payload[key] = [this.generatePrimitive(prop.items, key, forceRandom)];
            }
          } else {
            payload[key] = [];
          }
        } else if (prop.type === 'object') {
          payload[key] = await this.injectDatasetValues(prop, forceRandom);
        } else {
          payload[key] = `${key}_val_${Math.floor(Math.random() * 1000)}`;
        }
      }
    }

    return payload;
  }

  async generateRuleBasedScenarios(
    schema: Record<string, unknown>,
    path: string,
    method: string,
    parameters?: Array<{
      name: string;
      in: 'query' | 'header' | 'path' | 'cookie' | 'body';
      required?: boolean;
      schema?: Record<string, unknown>;
    }>,
  ): Promise<GeneratedScenario[]> {
    const scenarios: GeneratedScenario[] = [];
    const properties = (schema.properties as Record<string, any>) || {};
    const category = this.getEndpointCategory(path, method);

    const queryParamsList = (parameters || []).filter(p => p.in === 'query');
    const pathParamsList = (parameters || []).filter(p => p.in === 'path');

    const baseQueryParams: Record<string, string> = {};
    const basePathParams: Record<string, string> = {};

    queryParamsList.forEach(p => {
      baseQueryParams[p.name] = this.generateValueForParamSchema(p.schema, p.name);
    });

    pathParamsList.forEach(p => {
      basePathParams[p.name] = this.generateValueForParamSchema(p.schema, p.name);
    });

    const hasBodyPayload = Object.keys(properties).length > 0;

    // 1. Valid Request (Standard)
    const validPayload = hasBodyPayload ? await this.injectDatasetValues(schema, false) : {};
    scenarios.push({
      scenarioName: hasBodyPayload ? 'Valid Payload (Standard)' : 'Valid Request (Standard)',
      generationRule: 'valid',
      expectedResult: category === 'write' ? '201 Created' : '200 OK',
      payload: validPayload,
      queryParams: baseQueryParams,
      pathParams: basePathParams,
    });

    if (hasBodyPayload) {
      // 2. Valid Payload (Alternative Randomization)
      const validAltPayload = await this.injectDatasetValues(schema, true);
      Object.keys(validAltPayload).forEach((k) => {
        const val = validAltPayload[k];
        if (typeof val === 'string' && !val.includes('@')) {
          validAltPayload[k] = `${val}_alt`;
        } else if (typeof val === 'number') {
          validAltPayload[k] = val + 5;
        }
      });

      let altExpected = '200 OK';
      if (category === 'auth') {
        const lowerP = path.toLowerCase();
        if (lowerP.includes('login') || lowerP.includes('token') || lowerP.includes('signin') || lowerP.includes('auth')) {
          altExpected = '401 Unauthorized';
        } else if (lowerP.includes('forgot') || lowerP.includes('reset') || lowerP.includes('password') || lowerP.includes('otp')) {
          altExpected = '400 Bad Request';
        } else {
          altExpected = '401 Unauthorized';
        }
      } else if (category === 'read') {
        altExpected = '404 Not Found';
      } else if (category === 'write') {
        altExpected = '201 Created';
      }

      scenarios.push({
        scenarioName: 'Valid Payload (Alternative Randomization)',
        generationRule: 'valid_alternative',
        expectedResult: altExpected,
        payload: validAltPayload,
        queryParams: baseQueryParams,
        pathParams: basePathParams,
      });

      // 3. Missing Properties (Optional fields omitted)
      const keys = Object.keys(validPayload);
      if (keys.length > 1) {
        const omittedPayload = { ...validPayload };
        const omitKey = keys[Math.floor(Math.random() * keys.length)];
        delete omittedPayload[omitKey];
        scenarios.push({
          scenarioName: `Missing Field: Omit "${omitKey}"`,
          generationRule: 'missing_field',
          expectedResult: '400 Bad Request',
          payload: omittedPayload,
          queryParams: baseQueryParams,
          pathParams: basePathParams,
        });
      }

      // 4. Type Mismatch (Number fields sent as string)
      const typeMismatchPayload = { ...validPayload };
      let mutatedType = false;
      Object.entries(properties).forEach(([key, prop]) => {
        if ((prop.type === 'number' || prop.type === 'integer') && typeMismatchPayload[key] !== undefined) {
          typeMismatchPayload[key] = `not_a_number_${typeMismatchPayload[key]}`;
          mutatedType = true;
        }
      });
      if (mutatedType) {
        scenarios.push({
          scenarioName: 'Type Mismatch (Numeric as String)',
          generationRule: 'type_mismatch',
          expectedResult: '400 Bad Request',
          payload: typeMismatchPayload,
          queryParams: baseQueryParams,
          pathParams: basePathParams,
        });
      }

      // 5. Boundary Case (Minimum/Zero Limits)
      const boundaryPayload = { ...validPayload };
      Object.entries(properties).forEach(([key, prop]) => {
        if (prop.type === 'number' || prop.type === 'integer') {
          boundaryPayload[key] = 0;
        } else if (prop.type === 'string') {
          boundaryPayload[key] = '';
        } else if (prop.type === 'array') {
          boundaryPayload[key] = [];
        }
      });
      scenarios.push({
        scenarioName: 'Boundary Limits (Zero & Empty)',
        generationRule: 'boundary',
        expectedResult: '400 Bad Request',
        payload: boundaryPayload,
        queryParams: baseQueryParams,
        pathParams: basePathParams,
      });

      // 6. SQL Injection Attack
      const sqliPayload = { ...validPayload };
      Object.keys(sqliPayload).forEach((k) => {
        if (typeof sqliPayload[k] === 'string') {
          sqliPayload[k] = "' OR '1'='1' --";
        }
      });
      scenarios.push({
        scenarioName: 'SQL Injection Vulnerability Test',
        generationRule: 'security-sqli',
        expectedResult: '400 Bad Request',
        payload: sqliPayload,
        queryParams: baseQueryParams,
        pathParams: basePathParams,
      });

      // 7. XSS Script Injection
      const xssPayload = { ...validPayload };
      Object.keys(xssPayload).forEach((k) => {
        if (typeof xssPayload[k] === 'string') {
          xssPayload[k] = '<script>alert("XSS")</script>';
        }
      });
      scenarios.push({
        scenarioName: 'Cross-Site Scripting (XSS) Test',
        generationRule: 'security-xss',
        expectedResult: '400 Bad Request',
        payload: xssPayload,
        queryParams: baseQueryParams,
        pathParams: basePathParams,
      });

      // 8. Path Traversal Payload
      const traversalPayload = { ...validPayload };
      Object.keys(traversalPayload).forEach((k) => {
        if (typeof traversalPayload[k] === 'string') {
          traversalPayload[k] = '../../../../etc/passwd';
        }
      });
      scenarios.push({
        scenarioName: 'Path Traversal Vulnerability Test',
        generationRule: 'ai-edge-case',
        expectedResult: '400 Bad Request',
        payload: traversalPayload,
        queryParams: baseQueryParams,
        pathParams: basePathParams,
      });

      // 9. Null Values Injection
      const nullPayload = { ...validPayload };
      Object.keys(nullPayload).forEach((k) => {
        nullPayload[k] = null;
      });
      scenarios.push({
        scenarioName: 'Null Values Inject (All Fields)',
        generationRule: 'null-injection',
        expectedResult: '400 Bad Request',
        payload: nullPayload,
        queryParams: baseQueryParams,
        pathParams: basePathParams,
      });
    }

    // Generate specific parameters test cases (especially if no body, but also if params are defined)
    // 10. Missing Required Query Parameters
    queryParamsList.filter(p => p.required).forEach(p => {
      const queryCopy = { ...baseQueryParams };
      delete queryCopy[p.name];
      scenarios.push({
        scenarioName: `Missing Required Query Param: "${p.name}"`,
        generationRule: 'missing_field',
        expectedResult: '400 Bad Request',
        payload: hasBodyPayload ? validPayload : {},
        queryParams: queryCopy,
        pathParams: basePathParams,
      });
    });

    // 11. Invalid Path Parameters (Not Found / Incorrect pattern)
    pathParamsList.forEach(p => {
      const pathCopy = { ...basePathParams };
      pathCopy[p.name] = `${pathCopy[p.name]}_notfound`;
      scenarios.push({
        scenarioName: `Not Found Path Param: "${p.name}"`,
        generationRule: 'ai-edge-case',
        expectedResult: '404 Not Found',
        payload: hasBodyPayload ? validPayload : {},
        queryParams: baseQueryParams,
        pathParams: pathCopy,
      });
    });

    // 12. SQL Injection / XSS in parameters (if query parameters exist)
    let hasStringQuery = false;
    const sqliQuery = { ...baseQueryParams };
    const xssQuery = { ...baseQueryParams };

    queryParamsList.forEach(p => {
      if (!p.schema || p.schema.type === 'string') {
        sqliQuery[p.name] = "' OR '1'='1' --";
        xssQuery[p.name] = '<script>alert("XSS")</script>';
        hasStringQuery = true;
      }
    });

    if (hasStringQuery) {
      scenarios.push({
        scenarioName: 'SQL Injection in Query Params',
        generationRule: 'security-sqli',
        expectedResult: '400 Bad Request',
        payload: hasBodyPayload ? validPayload : {},
        queryParams: sqliQuery,
        pathParams: basePathParams,
      });
      scenarios.push({
        scenarioName: 'XSS in Query Params',
        generationRule: 'security-xss',
        expectedResult: '400 Bad Request',
        payload: hasBodyPayload ? validPayload : {},
        queryParams: xssQuery,
        pathParams: basePathParams,
      });
    }

    return scenarios;
  }

  async generateAICases(
    schema: Record<string, unknown>,
    endpointPath: string,
    method: string,
    endpointSummary?: string,
    geminiApiKey?: string,
    parameters?: Array<{
      name: string;
      in: 'query' | 'header' | 'path' | 'cookie' | 'body';
      required?: boolean;
      schema?: Record<string, unknown>;
    }>,
  ): Promise<GeneratedScenario[]> {
    try {
      const { client, model } = await this.getClientAndModel(geminiApiKey);

      // Load approved mappings and datasets to inject mapped values
      const approvedMappings = await this.mappingRepository.find({ where: { userApproved: true } });
      const datasets = await this.datasetRepository.find();
      const mappingInfo: Record<string, any> = {};
      for (const key of Object.keys(schema.properties || {})) {
        const mapping = approvedMappings.find((m) => m.sourceField === key);
        if (mapping) {
          const dataset = datasets.find((d) => d.datasetName === mapping.datasetName);
          if (dataset && dataset.records && dataset.records.length > 0) {
            const record = dataset.records[Math.floor(Math.random() * dataset.records.length)];
            const val = this.getNestedValue(record, mapping.targetField);
            if (val !== undefined) {
              mappingInfo[key] = val;
            }
          }
        }
      }

      const systemPrompt = `You are a Senior QA Architect and API Automation Engineer with over 15 years of experience.

Your task is to generate a concise, high-value API test suite for ONE endpoint.

Objective:
Generate the minimum number of test cases that achieve maximum functional, validation, security, and business coverage.

Rules:
1. Do NOT generate duplicate scenarios.
2. Prefer meaningful scenarios over exhaustive permutations.
3. Use business reasoning whenever possible.
4. Use mapped values whenever provided.
5. Cover:
  - Happy path
  - Required field/parameter validation
  - Boundary values
  - Invalid data
  - Authentication & Authorization
  - Business rules
  - Data mapping validation
  - Response validation
  - Security

For every test case, you MUST return a JSON object with these EXACT keys:
- "Title": string (Brief scenario name)
- "Priority": "Critical" | "High" | "Medium" | "Low"
- "Category": string (e.g. "Functional", "Security", "Validation")
- "Description": string (Explanation of the scenario and why it is tested)
- "Request Payload": object (A complete, realistic request payload that matches the endpoint schema. Ensure all fields are realistic. Return empty object {} if endpoint has no body schema)
- "Query Parameters": object (Flat object containing query parameter key-value pairs matching parameter list. Return empty object {} if none)
- "Path Parameters": object (Flat object containing path parameter key-value pairs matching path parameter list. Return empty object {} if none)
- "Expected HTTP Status": number (e.g. 200, 201, 400, 401, 403, 404)
- "Expected Result": string (Explanation of the expected outcome)
- "Assertions": string[] (Array of assertions, e.g. ["status is 200", "body.id is present"])

Only generate test cases that add unique coverage.
Return ONLY valid JSON array of objects. Do NOT include markdown code block formatting (such as \`\`\`json) or conversational text. Return only the raw JSON array.`;

      const userPrompt = `Generate an AI-enriched test suite for API endpoint '${method.toUpperCase()} ${endpointPath}' (${endpointSummary || ''}) matching schema: ${JSON.stringify(schema)}.
Parameters: ${JSON.stringify(parameters || [])}.
${Object.keys(mappingInfo).length > 0 ? `Use these valid mapped database values in payload/query/path keys if they are defined: ${JSON.stringify(mappingInfo)}` : ''}

Ensure output is a valid JSON array of objects following the system format instructions.`;

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      });

      const content = response?.choices[0]?.message?.content || '[]';
      const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let jsonArrayStr = cleanJsonStr;
      const startIdx = cleanJsonStr.indexOf('[');
      const endIdx = cleanJsonStr.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonArrayStr = cleanJsonStr.substring(startIdx, endIdx + 1);
      }

      const testCases = JSON.parse(jsonArrayStr);
      if (Array.isArray(testCases)) {
        return testCases.map((item: any) => ({
          scenarioName: item.Title || 'AI Scenario',
          generationRule: 'ai_enriched',
          expectedResult: `${item['Expected HTTP Status'] || 200} ${item['Expected Result'] || 'OK'}`,
          payload: item['Request Payload'] || {},
          queryParams: item['Query Parameters'] || {},
          pathParams: item['Path Parameters'] || {},
          priority: item.Priority || 'Medium',
          category: item.Category || 'Functional',
          description: item.Description || '',
          assertions: item.Assertions || [],
        }));
      }

      return [];
    } catch (error: any) {
      this.logger.warn(`AI deeper scenario generation fallback: ${error.message}`);
      const validPayload = await this.injectDatasetValues(schema, true);
      return [
        {
          scenarioName: 'AI Deep Enriched Happy Path (Fallback)',
          generationRule: 'ai_enriched',
          expectedResult: method.toLowerCase() === 'post' ? '201 Created' : '200 OK',
          payload: validPayload,
          priority: 'Critical',
          category: 'Functional',
          description: 'Fallback scenario due to AI Deep generation issue.',
          assertions: ['status is 2xx'],
        },
      ];
    }
  }

  async enrichPayloadWithLocalAI(
    schema: Record<string, unknown>,
    endpointPath: string,
    method: string,
    endpointSummary?: string,
  ): Promise<{ expectedResult: string; payload: Record<string, unknown> }> {
    try {
      const cases = await this.generateAICases(schema, endpointPath, method, endpointSummary);
      if (cases && cases.length > 0) {
        return {
          expectedResult: cases[0].expectedResult,
          payload: cases[0].payload,
        };
      }
    } catch {}
    const validPayload = await this.injectDatasetValues(schema, true);
    return {
      expectedResult: '200 OK',
      payload: validPayload,
    };
  }

  private buildValidBasePayload(schema: Record<string, unknown>, forceRandom = false): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    const properties = (schema.properties as Record<string, any>) || {};

    Object.entries(properties).forEach(([key, prop]) => {
      const useExample = prop.example !== undefined && !forceRandom;

      if (prop.type === 'string') {
        if (useExample) {
          payload[key] = prop.example;
        } else if (key.toLowerCase().includes('email') || key.toLowerCase().includes('mail')) {
          payload[key] = `user_${Math.floor(Math.random() * 9000 + 1000)}@example.com`;
        } else if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) {
          payload[key] = `+1-555-${Math.floor(Math.random() * 9000000 + 1000000)}`;
        } else if (key.toLowerCase().includes('id') || key.toLowerCase().includes('uuid')) {
          payload[key] = `id_${Math.random().toString(36).substr(2, 9)}`;
        } else {
          payload[key] = `${key}_val_${Math.floor(Math.random() * 1000)}`;
        }
      } else if (prop.type === 'number' || prop.type === 'integer') {
        if (useExample) {
          payload[key] = prop.example;
        } else {
          payload[key] = Math.floor(Math.random() * 90 + 10);
        }
      } else if (prop.type === 'boolean') {
        payload[key] = Math.random() > 0.5;
      } else if (prop.type === 'array') {
        if (prop.items && typeof prop.items === 'object') {
          if (prop.items.type === 'object') {
            payload[key] = [this.buildValidBasePayload(prop.items, forceRandom)];
          } else {
            payload[key] = [this.generatePrimitive(prop.items, key, forceRandom)];
          }
        } else {
          payload[key] = [];
        }
      } else if (prop.type === 'object') {
        payload[key] = this.buildValidBasePayload(prop, forceRandom);
      } else {
        payload[key] = `${key}_val_${Math.floor(Math.random() * 1000)}`;
      }
    });

    return payload;
  }

  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      if(Array.isArray(current)){
        current = current[0][part];
      }else
      current = current[part];
    }
    return current;
  }

  private isFieldMatch(fieldName: string, requestKey: string): boolean {
    const fieldLower = fieldName.toLowerCase();
    const keyLower = requestKey.toLowerCase();

    if (fieldLower === keyLower) return true;

    // Handle nested fields like "sites.id" matching "siteId" or "site_id"
    if (fieldName.includes('.')) {
      const parts = fieldLower.split('.');
      const lastPart = parts[parts.length - 1]; // e.g. "id"
      const parentPart = parts[parts.length - 2]; // e.g. "sites"
      const parentSingular = parentPart.endsWith('s') ? parentPart.slice(0, -1) : parentPart; // e.g. "site"

      if (
        keyLower === `${parentSingular}${lastPart}` ||
        keyLower === `${parentSingular}_${lastPart}` ||
        keyLower === `${parentPart}${lastPart}` ||
        keyLower === `${parentPart}_${lastPart}`
      ) {
        return true;
      }
    }

    return false;
  }
}
