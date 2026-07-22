import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface GeneratedScenario {
  scenarioName: string;
  generationRule: string;
  expectedResult: 'success' | 'client_error' | 'validation_error' | 'security_blocked';
  payload: Record<string, unknown>;
}

@Injectable()
export class ScenarioService {
  private readonly logger = new Logger(ScenarioService.name);
  private openaiClient?: OpenAI;

  constructor() {
    const baseURL = process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1';
    this.openaiClient = new OpenAI({
      baseURL,
      apiKey: 'local-ai-key', // Dummy key for local endpoints
    });
  }

  private async getActiveModelName(): Promise<string> {
    const configuredModel = process.env.LOCAL_AI_MODEL || 'unsloth/gemma-4-E2B-it-GGUF';
    try {
      if (this.openaiClient) {
        const list = await this.openaiClient.models.list();
        const availableModels = list.data.map((m) => m.id);

        if (availableModels.includes(configuredModel)) {
          return configuredModel;
        }

        const matched = availableModels.find(
          (m) =>
            m.toLowerCase().includes('gemma') ||
            m.toLowerCase().includes(configuredModel.toLowerCase())
        );
        if (matched) return matched;

        if (availableModels.length > 0) {
          return availableModels[0];
        }
      }
    } catch {
      // Ignore models.list errors and use fallback configured model
    }
    return configuredModel;
  }

  generateRuleBasedScenarios(schema: Record<string, unknown>): GeneratedScenario[] {
    const scenarios: GeneratedScenario[] = [];
    const basePayload = this.buildValidBasePayload(schema);

    // 1. Valid Payload
    scenarios.push({
      scenarioName: 'Valid Payload Test',
      generationRule: 'valid',
      expectedResult: 'success',
      payload: basePayload,
    });

    // 2. Null Fields
    const nullPayload: Record<string, unknown> = {};
    Object.keys(basePayload).forEach((k) => {
      nullPayload[k] = null;
    });
    scenarios.push({
      scenarioName: 'Null Fields Payload',
      generationRule: 'null',
      expectedResult: 'validation_error',
      payload: nullPayload,
    });

    // 3. Empty String Fields
    const emptyPayload: Record<string, unknown> = {};
    Object.keys(basePayload).forEach((k) => {
      emptyPayload[k] = typeof basePayload[k] === 'string' ? '' : basePayload[k];
    });
    scenarios.push({
      scenarioName: 'Empty Values Payload',
      generationRule: 'empty',
      expectedResult: 'validation_error',
      payload: emptyPayload,
    });

    // 4. SQL Injection Attack Payload
    const sqliPayload: Record<string, unknown> = {};
    Object.keys(basePayload).forEach((k) => {
      sqliPayload[k] = typeof basePayload[k] === 'string' ? "' OR '1'='1' --" : basePayload[k];
    });
    scenarios.push({
      scenarioName: 'SQL Injection Test',
      generationRule: 'sql_injection',
      expectedResult: 'security_blocked',
      payload: sqliPayload,
    });

    // 5. XSS Script Injection Payload
    const xssPayload: Record<string, unknown> = {};
    Object.keys(basePayload).forEach((k) => {
      xssPayload[k] = typeof basePayload[k] === 'string' ? '<script>alert("XSS")</script>' : basePayload[k];
    });
    scenarios.push({
      scenarioName: 'XSS Injection Test',
      generationRule: 'xss',
      expectedResult: 'security_blocked',
      payload: xssPayload,
    });

    return scenarios;
  }

  async enrichPayloadWithLocalAI(
    schema: Record<string, unknown>,
    endpointSummary?: string,
  ): Promise<Record<string, unknown>> {
    try {
      const model = await this.getActiveModelName();
      const response = await this.openaiClient?.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an AI API testing assistant. Output ONLY valid JSON payloads matching the provided schema. Do NOT copy the default example values if they are specified in the schema. Make all values realistic, randomized, and tailored to the endpoint name and description. Output ONLY the raw JSON block without markdown formatting or conversational text.',
          },
          {
            role: 'user',
            content: `Generate a realistic mock JSON request payload for API endpoint '${endpointSummary || ''}' matching schema: ${JSON.stringify(schema)}. Do NOT use the default examples, generate new random but valid data.`,
          },
        ],
        temperature: 0.85,
      });

      const content = response?.choices[0]?.message?.content || '{}';
      const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonStr);
    } catch (error: any) {
      this.logger.warn(`Local AI generation fallback: ${error.message}`);
      return this.buildValidBasePayload(schema, true);
    }
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
        payload[key] = [];
      } else if (prop.type === 'object') {
        payload[key] = {};
      } else {
        payload[key] = `${key}_val_${Math.floor(Math.random() * 1000)}`;
      }
    });

    return payload;
  }
}
