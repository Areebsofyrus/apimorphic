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

  async getClientAndModel(geminiApiKey?: string): Promise<{ client: OpenAI; model: string; isOnline: boolean }> {
    if (geminiApiKey) {
      try {
        const client = new OpenAI({
          apiKey: geminiApiKey,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
        });
        // Test key validity
        await client.models.list();
        return {
          client,
          model: 'gemini-2.5-flash',
          isOnline: true,
        };
      } catch (err: any) {
        this.logger.warn(`Gemini API key validation failed: ${err.message}.`);
        const client = new OpenAI({
          apiKey: geminiApiKey,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
        });
        return { client, model: 'gemini-2.5-flash', isOnline: false };
      }
    }

    const globalApiKey = process.env.GEMINI_API_KEY;
    if (globalApiKey) {
      try {
        const client = new OpenAI({
          apiKey: globalApiKey,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
        });
        // Test key validity
        await client.models.list();
        return {
          client,
          model: 'gemini-2.5-flash',
          isOnline: true,
        };
      } catch (err: any) {
        this.logger.warn(`Global Gemini API key validation failed: ${err.message}. Falling back to local AI.`);
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
        return { client, model: configuredModel, isOnline: true };
      }
      const matched = availableModels.find(
        (m) =>
          m.toLowerCase().includes('gemma') ||
          m.toLowerCase().includes(configuredModel.toLowerCase())
      );
      if (matched) return { client, model: matched, isOnline: true };
      if (availableModels.length > 0) {
        // return { client, model: availableModels[0], isOnline: true };
        return { client, model: '', isOnline: false };
      }
    } catch {
      // Fallback
    }
    // return { client, model: configuredModel, isOnline: false };
    return { client, model: '', isOnline: true };
  }

  async getActiveModelName(geminiApiKey?: string): Promise<string> {
    const { model, isOnline } = await this.getClientAndModel(geminiApiKey);
    return isOnline ? model : 'offline';
  }

  async analyzeFailure(
    params: {
      endpoint: string;
      method: string;
      scenarioName: string;
      statusCode: number;
      requestPayload: Record<string, unknown>;
      responseBody?: Record<string, unknown>;
    },
    geminiApiKey?: string,
  ): Promise<string> {
    try {
      const { client, model } = await this.getClientAndModel(geminiApiKey);
      const prompt = `Analyze this API test failure and provide a 2-sentence concise root cause diagnosis and fix suggestion:
Endpoint: ${params.method} ${params.endpoint}
Scenario: ${params.scenarioName}
Status Code: ${params.statusCode}
Request Payload: ${JSON.stringify(params.requestPayload)}
Response Body: ${JSON.stringify(params.responseBody || {})}`;

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are an expert API debugging AI.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });

      return response?.choices[0]?.message?.content || 'AI analysis unavailable.';
    } catch (error: any) {
      this.logger.warn(`AI diagnosis warning: ${error.message}`);
      return `Failed with status ${params.statusCode}. Verify request schema parameters and authentication headers.`;
    }
  }
}
