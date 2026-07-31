import axios from 'axios';

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).API_BASE_URL) {
    return (window as any).API_BASE_URL;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return 'http://localhost:3000';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface EndpointSpec {
  id: string;
  path: string;
  method: string;
  summary?: string;
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
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

export const parseSwaggerApi = async (specStr: string) => {
  let specJson;
  try {
    specJson = JSON.parse(specStr);
  } catch {
    specJson = specStr;
  }
  const res = await api.post('/parser/swagger', { spec: specJson });
  return res.data;
};

export const parsePostmanApi = async (collectionStr: string) => {
  const collectionJson = JSON.parse(collectionStr);
  const res = await api.post('/parser/postman', { collection: collectionJson });
  return res.data;
};

export const generateScenariosApi = async (schema: Record<string, unknown>, endpointSummary?: string) => {
  const res = await api.post('/runner/generate-scenarios', { schema, endpointSummary });
  return res.data;
};

export const executeTestApi = async (requestPayload: Record<string, unknown>) => {
  const res = await api.post('/runner/execute', requestPayload);
  return res.data as ExecutionResponse;
};
