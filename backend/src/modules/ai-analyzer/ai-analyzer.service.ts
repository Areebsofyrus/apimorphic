import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiAnalyzerService {
  private readonly logger = new Logger(AiAnalyzerService.name);
  private openaiClient?: OpenAI;

  constructor() {
    const baseURL = process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1';
    this.openaiClient = new OpenAI({
      baseURL,
      apiKey: 'local-ai-key',
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
      // Fallback
    }
    return configuredModel;
  }

  async analyzeFailure(params: {
    endpoint: string;
    method: string;
    scenarioName: string;
    statusCode: number;
    requestPayload: Record<string, unknown>;
    responseBody?: Record<string, unknown>;
  }): Promise<string> {
    try {
      const model = await this.getActiveModelName();
      const prompt = `Analyze this API test failure and provide a 2-sentence concise root cause diagnosis and fix suggestion:
Endpoint: ${params.method} ${params.endpoint}
Scenario: ${params.scenarioName}
Status Code: ${params.statusCode}
Request Payload: ${JSON.stringify(params.requestPayload)}
Response Body: ${JSON.stringify(params.responseBody || {})}`;

      const response = await this.openaiClient?.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are an expert API debugging AI.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });

      return response?.choices[0]?.message?.content || 'Local AI analysis unavailable.';
    } catch (error: any) {
      this.logger.warn(`Local AI diagnosis warning: ${error.message}`);
      return `Failed with status ${params.statusCode}. Verify request schema parameters and authentication headers.`;
    }
  }
}
