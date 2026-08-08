const API_BASE = (import.meta as any).env.VITE_API_BASE_URL ?? 'http://localhost:3010';

export { API_BASE };

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('tester_jwt_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  } as Record<string, string>;

  return fetch(url, {
    ...options,
    headers,
  });
}

// Authentication APIs
export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Login failed');
  }

  return response.json();
}

export async function register(email: string, password: string, name?: string) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Registration failed');
  }

  return response.json();
}

export async function fetchMe() {
  const response = await fetchWithAuth(`${API_BASE}/auth/me`);
  if (!response.ok) {
    throw new Error('Failed to fetch profile info');
  }
  return response.json();
}

export async function saveKeys(geminiApiKey: string) {
  const response = await fetchWithAuth(`${API_BASE}/auth/save-keys`, {
    method: 'POST',
    body: JSON.stringify({ geminiApiKey }),
  });
  if (!response.ok) {
    throw new Error('Failed to save API keys');
  }
  return response.json();
}

export async function saveWorkspaceProfiles(id: string, profiles: any[], activeProfileName: string, globalVariables?: Record<string, string>) {
  const response = await fetchWithAuth(`${API_BASE}/parser/workspace/${id}/profiles`, {
    method: 'POST',
    body: JSON.stringify({ profiles, activeProfileName, globalVariables }),
  });
  if (!response.ok) {
    throw new Error('Failed to save environment profiles');
  }
  return response.json();
}

export async function saveWorkspaceConfig(id: string, config: any) {
  const response = await fetchWithAuth(`${API_BASE}/parser/workspace/${id}/env-config`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw new Error('Failed to save environment configurations');
  }
  return response.json();
}

// Parser APIs
export async function parseSwaggerSpec(spec: string) {
  const response = await fetchWithAuth(`${API_BASE}/parser/swagger`, {
    method: 'POST',
    body: JSON.stringify({ spec }),
  });

  if (!response.ok) {
    throw new Error(`Failed to parse spec: ${response.statusText}`);
  }

  return response.json();
}

export async function parsePostmanSpec(collectionStr: string) {
  let collectionJson;
  try {
    collectionJson = JSON.parse(collectionStr);
  } catch (err: any) {
    throw new Error('Invalid JSON format: ' + err.message);
  }

  const response = await fetchWithAuth(`${API_BASE}/parser/postman`, {
    method: 'POST',
    body: JSON.stringify({ collection: collectionJson }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Failed to parse Postman collection: ${response.statusText}`);
  }

  return response.json();
}

export async function parseSwaggerUrl(url: string) {
  const response = await fetchWithAuth(`${API_BASE}/parser/swagger-url`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Failed to parse spec from URL: ${response.statusText}`);
  }

  return response.json();
}

export async function syncWorkspaceSpec(id: string) {
  const response = await fetchWithAuth(`${API_BASE}/parser/sync`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Sync failed: ${response.statusText}`);
  }

  return response.json();
}

// Scenario Generation APIs
export async function generateScenarios(
  schema: object,
  endpointSummary: string,
  path: string,
  method: string,
  enrichWithAi = false,
  geminiApiKey?: string,
  parameters?: any[]
) {
  const response = await fetchWithAuth(`${API_BASE}/runner/generate-scenarios`, {
    method: 'POST',
    body: JSON.stringify({ schema, endpointSummary, path, method, enrichWithAi, geminiApiKey, parameters }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate scenarios: ${response.statusText}`);
  }

  return response.json();
}

export async function executeTest(params: {
  workspaceId: string;
  baseUrl: string;
  endpoint: string;
  method: string;
  payload: object;
  scenarioName: string;
  generationRule: string;
  expectedResult?: string;
  headers?: Record<string, string>;
  prerequisites?: any[];
  geminiApiKey?: string;
}) {
  const response = await fetchWithAuth(`${API_BASE}/runner/execute`, {
    method: 'POST',
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to execute test: ${response.statusText}`);
  }

  return response.json();
}

// Dataset APIs
export async function fetchDatasets() {
  const response = await fetchWithAuth(`${API_BASE}/dataset`);
  if (!response.ok) {
    throw new Error('Failed to fetch datasets');
  }
  return response.json();
}

// Smart Mapping APIs
export async function fetchMappings() {
  const response = await fetchWithAuth(`${API_BASE}/intelligence/mappings`);
  if (!response.ok) {
    throw new Error('Failed to fetch smart mappings');
  }
  return response.json();
}

export async function fetchRequestFields() {
  const response = await fetchWithAuth(`${API_BASE}/intelligence/request-fields`);
  if (!response.ok) {
    throw new Error('Failed to fetch request fields');
  }
  return response.json();
}

export async function approveMappingRule(id: string, status: 'approved' | 'rejected' | 'pending') {
  const response = await fetchWithAuth(`${API_BASE}/intelligence/approve`, {
    method: 'POST',
    body: JSON.stringify({ id, status }),
  });
  if (!response.ok) {
    throw new Error('Failed to approve mapping rule');
  }
  return response.json();
}

export async function createMappingRule(params: { sourceField: string; datasetName: string; targetField: string }) {
  const response = await fetchWithAuth(`${API_BASE}/intelligence/create`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error('Failed to create mapping rule');
  }
  return response.json();
}

export async function deleteMappingRule(id: string) {
  const response = await fetchWithAuth(`${API_BASE}/intelligence/delete`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error('Failed to delete mapping rule');
  }
  return response.json();
}

// History & Execution Log APIs
export async function fetchHistory() {
  const response = await fetchWithAuth(`${API_BASE}/runner/history`);
  if (!response.ok) {
    throw new Error('Failed to fetch test run history');
  }
  return response.json();
}

export async function fetchActiveModel(geminiApiKey?: string) {
  const query = geminiApiKey !== undefined ? `?geminiApiKey=${encodeURIComponent(geminiApiKey)}` : '';
  const response = await fetchWithAuth(`${API_BASE}/runner/model${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch active model');
  }
  return response.json();
}

export async function fetchSavedSpecs() {
  const response = await fetchWithAuth(`${API_BASE}/parser/specs`);
  if (!response.ok) {
    throw new Error('Failed to fetch saved specs');
  }
  return response.json();
}

export async function fetchCustomScenarios(endpointId: string, workspaceId: string) {
  const response = await fetchWithAuth(
    `${API_BASE}/scenario/list?endpointId=${encodeURIComponent(endpointId)}&workspaceId=${encodeURIComponent(workspaceId)}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch custom scenarios');
  }
  return response.json();
}

export async function saveCustomScenario(params: {
  workspaceId: string;
  endpointId: string;
  scenarioName: string;
  expectedResult: string;
  payload: Record<string, unknown>;
  generationRule?: string;
  priority?: string;
  category?: string;
  description?: string;
  assertions?: string[];
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
}) {
  const response = await fetchWithAuth(`${API_BASE}/scenario/save`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error('Failed to save custom scenario');
  }
  return response.json();
}

export async function deleteCustomScenario(id: string) {
  const response = await fetchWithAuth(`${API_BASE}/scenario/delete/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete custom scenario');
  }
  return response.json();
}

export async function updateWorkspaceBaseUrl(id: string, baseUrl: string) {
  const response = await fetchWithAuth(`${API_BASE}/parser/update-base-url`, {
    method: 'POST',
    body: JSON.stringify({ id, baseUrl }),
  });
  if (!response.ok) {
    throw new Error(`Failed to save base URL: ${response.statusText}`);
  }
  return response.json();
}

export async function linkWorkspaceUrl(id: string, url: string) {
  const response = await fetchWithAuth(`${API_BASE}/parser/link-url`, {
    method: 'POST',
    body: JSON.stringify({ id, url }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Failed to link Swagger URL: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchEndpointHistory(endpointPath: string, method: string, workspaceId: string) {
  const response = await fetchWithAuth(
    `${API_BASE}/runner/history-by-endpoint?endpointPath=${encodeURIComponent(
      endpointPath
    )}&method=${encodeURIComponent(method)}&workspaceId=${encodeURIComponent(workspaceId)}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch endpoint history');
  }
  return response.json();
}

export async function deleteWorkspace(id: string) {
  const response = await fetchWithAuth(`${API_BASE}/parser/delete-workspace`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error('Failed to delete workspace');
  }
  return response.json();
}

export async function deleteExecutionLog(id: string) {
  const response = await fetchWithAuth(`${API_BASE}/runner/delete-log`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error('Failed to delete execution log');
  }
  return response.json();
}

export async function clearEndpointHistory(endpointPath: string, method: string, workspaceId: string) {
  const response = await fetchWithAuth(`${API_BASE}/runner/clear-endpoint-history`, {
    method: 'POST',
    body: JSON.stringify({ endpointPath, method, workspaceId }),
  });
  if (!response.ok) {
    throw new Error('Failed to clear endpoint history');
  }
  return response.json();
}
