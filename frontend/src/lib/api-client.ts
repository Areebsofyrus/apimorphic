const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3010';

export { API_BASE };

export async function parseSwaggerSpec(spec: string) {
  const response = await fetch(`${API_BASE}/parser/swagger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spec }),
  });

  if (!response.ok) {
    throw new Error(`Failed to parse spec: ${response.statusText}`);
  }

  return response.json();
}

export async function parseSwaggerUrl(url: string) {
  const response = await fetch(`${API_BASE}/parser/swagger-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Failed to parse spec from URL: ${response.statusText}`);
  }

  return response.json();
}

export async function syncWorkspaceSpec(id: string) {
  const response = await fetch(`${API_BASE}/parser/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Sync failed: ${response.statusText}`);
  }

  return response.json();
}

export async function generateScenarios(schema: object, endpointSummary: string) {
  const response = await fetch(`${API_BASE}/runner/generate-scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schema, endpointSummary }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate scenarios: ${response.statusText}`);
  }

  return response.json();
}

export async function executeTest(params: {
  baseUrl: string;
  endpoint: string;
  method: string;
  payload: object;
  scenarioName: string;
  generationRule: string;
  headers?: Record<string, string>;
  prerequisites?: any[];
}) {
  const response = await fetch(`${API_BASE}/runner/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to execute test: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchDatasets() {
  const response = await fetch(`${API_BASE}/dataset`);
  if (!response.ok) {
    throw new Error('Failed to fetch datasets');
  }
  return response.json();
}

export async function fetchMappings() {
  const response = await fetch(`${API_BASE}/intelligence/mappings`);
  if (!response.ok) {
    throw new Error('Failed to fetch smart mappings');
  }
  return response.json();
}

export async function approveMappingRule(id: string, status: 'approved' | 'rejected') {
  const response = await fetch(`${API_BASE}/intelligence/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status }),
  });
  if (!response.ok) {
    throw new Error('Failed to approve mapping rule');
  }
  return response.json();
}

export async function fetchHistory() {
  const response = await fetch(`${API_BASE}/runner/history`);
  if (!response.ok) {
    throw new Error('Failed to fetch test run history');
  }
  return response.json();
}

export async function fetchActiveModel() {
  const response = await fetch(`${API_BASE}/runner/model`);
  if (!response.ok) {
    throw new Error('Failed to fetch active model');
  }
  return response.json();
}

export async function fetchSavedSpecs() {
  const response = await fetch(`${API_BASE}/parser/specs`);
  if (!response.ok) {
    throw new Error('Failed to fetch saved specs');
  }
  return response.json();
}

export async function fetchCustomScenarios(endpointId: string) {
  const response = await fetch(`${API_BASE}/scenario/list?endpointId=${encodeURIComponent(endpointId)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch custom scenarios');
  }
  return response.json();
}

export async function saveCustomScenario(params: {
  endpointId: string;
  scenarioName: string;
  expectedResult: string;
  payload: Record<string, unknown>;
}) {
  const response = await fetch(`${API_BASE}/scenario/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error('Failed to save custom scenario');
  }
  return response.json();
}

export async function deleteCustomScenario(id: string) {
  const response = await fetch(`${API_BASE}/scenario/delete/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete custom scenario');
  }
  return response.json();
}

export async function updateWorkspaceBaseUrl(id: string, baseUrl: string) {
  const response = await fetch(`${API_BASE}/parser/update-base-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, baseUrl }),
  });
  if (!response.ok) {
    throw new Error(`Failed to save base URL: ${response.statusText}`);
  }
  return response.json();
}

export async function linkWorkspaceUrl(id: string, url: string) {
  const response = await fetch(`${API_BASE}/parser/link-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, url }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Failed to link Swagger URL: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchEndpointHistory(endpointPath: string, method: string) {
  const response = await fetch(
    `${API_BASE}/runner/history-by-endpoint?endpointPath=${encodeURIComponent(
      endpointPath
    )}&method=${encodeURIComponent(method)}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch endpoint history');
  }
  return response.json();
}

export async function deleteWorkspace(id: string) {
  const response = await fetch(`${API_BASE}/parser/delete-workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error('Failed to delete workspace');
  }
  return response.json();
}

export async function deleteExecutionLog(id: string) {
  const response = await fetch(`${API_BASE}/runner/delete-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error('Failed to delete execution log');
  }
  return response.json();
}

export async function clearEndpointHistory(endpointPath: string, method: string) {
  const response = await fetch(`${API_BASE}/runner/clear-endpoint-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpointPath, method }),
  });
  if (!response.ok) {
    throw new Error('Failed to clear endpoint history');
  }
  return response.json();
}
