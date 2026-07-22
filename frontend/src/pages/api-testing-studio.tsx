import { useState, useEffect, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Search, Play, PlayCircle, Trash2, Loader2, Cpu, Sparkles, Terminal, PlusCircle, Save, Settings, Key, History } from 'lucide-react';
import { EndpointCard } from '@/components/endpoint-card';
import { ScenarioCard } from '@/components/scenario-card';
import { ExecutionResultCard } from '@/components/execution-result-card';
import { MethodBadge } from '@/components/method-badge';
import { Endpoint, Scenario, ExecutionResult } from '@/types/api';
import { MOCK_SCENARIOS } from '@/lib/mock-data';
import { executeTest, generateScenarios, fetchMappings, fetchDatasets, fetchCustomScenarios, saveCustomScenario, deleteCustomScenario, updateWorkspaceBaseUrl, fetchEndpointHistory, clearEndpointHistory, deleteExecutionLog } from '@/lib/api-client';
import { toast } from 'sonner';

const DEFAULT_BASE_URL = import.meta.env.VITE_TARGET_BASE_URL ?? 'https://httpbin.org';

const parseHeaders = (headersStr: string): Record<string, string> => {
  if (!headersStr || !headersStr.trim()) return {};
  try {
    const parsed = JSON.parse(headersStr);
    if (parsed && typeof parsed === 'object') {
      const clean: Record<string, string> = {};
      Object.entries(parsed).forEach(([k, v]) => {
        clean[k.trim()] = String(v).trim();
      });
      return clean;
    }
  } catch {
    // Ignore and run line by line fallback
  }

  const parsed: Record<string, string> = {};
  headersStr.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine === '{' || trimmedLine === '}') return;
    
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex > 0) {
      let key = trimmedLine.slice(0, colonIndex).trim();
      let val = trimmedLine.slice(colonIndex + 1).trim();
      
      key = key.replace(/^['"]|['"]$/g, '').trim();
      val = val.replace(/^['"]|['"]$/g, '').trim();
      
      if (val.endsWith(',')) {
        val = val.slice(0, -1).trim().replace(/^['"]|['"]$/g, '').trim();
      }

      if (key) {
        parsed[key] = val;
      }
    }
  });
  return parsed;
};

const parsePayload = (payloadStr: string): Record<string, any> => {
  try {
    return JSON.parse(payloadStr);
  } catch {
    return {};
  }
};

const generateExampleFromSchema = (schema: any): string => {
  if (!schema) return '{\n  \n}';
  if (schema.example) {
    return JSON.stringify(schema.example, null, 2);
  }
  const properties = schema.properties;
  if (!properties) return '{\n  \n}';
  const example: Record<string, any> = {};
  Object.entries(properties).forEach(([key, value]: [string, any]) => {
    if (value.example !== undefined) {
      example[key] = value.example;
    } else if (value.default !== undefined) {
      example[key] = value.default;
    } else if (value.type === 'string') {
      example[key] = value.format === 'date-time' ? new Date().toISOString() : 'string';
    } else if (value.type === 'number' || value.type === 'integer') {
      example[key] = 0;
    } else if (value.type === 'boolean') {
      example[key] = true;
    } else if (value.type === 'array') {
      example[key] = [];
    } else if (value.type === 'object') {
      example[key] = {};
    } else {
      example[key] = '';
    }
  });
  return JSON.stringify(example, null, 2);
};

interface ApiTestingStudioProps {
  endpoints: Endpoint[];
  aiModel?: string;
  specId?: string;
  selectedEndpointId: string | null;
  onSelectedEndpointIdChange: (id: string | null) => void;
}

export default function ApiTestingStudio({
  endpoints,
  aiModel = 'qwen2.5-coder:3b',
  specId,
  selectedEndpointId,
  onSelectedEndpointIdChange,
}: ApiTestingStudioProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  
  const selectedEndpoint = endpoints.find(e => e.id === selectedEndpointId) || endpoints[0] || null;
  const setSelectedEndpoint = (endpoint: Endpoint | null) => {
    onSelectedEndpointIdChange(endpoint?.id || null);
  };

  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isScenariosLoading, setIsScenariosLoading] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [customPayload, setCustomPayload] = useState('{\n  \n}');
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'active' | 'history'>('active');
  const [historyResults, setHistoryResults] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const loadEndpointHistory = async (path: string, method: string) => {
    setIsHistoryLoading(true);
    try {
      const logs = await fetchEndpointHistory(path, method);
      setHistoryResults(logs || []);
    } catch {
      // Ignore background error
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEndpoint) {
      loadEndpointHistory(selectedEndpoint.path, selectedEndpoint.method);
    }
  }, [selectedEndpoint]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [generatedScenarios, setGeneratedScenarios] = useState<Scenario[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newExpectedResult, setNewExpectedResult] = useState('');
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [customHeaders, setCustomHeaders] = useState('');
  const [preMethod, setPreMethod] = useState<'POST' | 'GET'>('POST');
  const [preEndpoint, setPreEndpoint] = useState('');
  const [prePayload, setPrePayload] = useState('{\n  "username": "admin",\n  "password": "password"\n}');
  const [preExtractKey, setPreExtractKey] = useState('access_token');
  const [runPreEverytime, setRunPreEverytime] = useState(false);

  // Sync state values when specId changes
  useEffect(() => {
    const suffix = specId ? `_${specId}` : '_default';
    const savedBaseUrl = localStorage.getItem(`tester_baseUrl${suffix}`);
    setBaseUrl(savedBaseUrl ?? (endpoints[0]?.baseUrl || DEFAULT_BASE_URL));
    setAuthToken(localStorage.getItem(`tester_authToken${suffix}`) ?? '');
    setCustomHeaders(localStorage.getItem(`tester_customHeaders${suffix}`) ?? '');
    setPreMethod((localStorage.getItem(`tester_preMethod${suffix}`) as 'POST' | 'GET') ?? 'POST');
    setPreEndpoint(localStorage.getItem(`tester_preEndpoint${suffix}`) ?? '');
    setPrePayload(localStorage.getItem(`tester_prePayload${suffix}`) ?? '{\n  "username": "admin",\n  "password": "password"\n}');
    setPreExtractKey(localStorage.getItem(`tester_preExtractKey${suffix}`) ?? 'access_token');
    setRunPreEverytime(localStorage.getItem(`tester_runPreEverytime${suffix}`) === 'true');
    setShowSettings(localStorage.getItem(`tester_showSettings${suffix}`) === 'true');
  }, [specId, endpoints]);

  // Sync changes back to localStorage
  useEffect(() => {
    const suffix = specId ? `_${specId}` : '_default';
    localStorage.setItem(`tester_baseUrl${suffix}`, baseUrl);
  }, [baseUrl, specId]);

  useEffect(() => {
    const suffix = specId ? `_${specId}` : '_default';
    localStorage.setItem(`tester_showSettings${suffix}`, String(showSettings));
  }, [showSettings, specId]);

  useEffect(() => {
    const suffix = specId ? `_${specId}` : '_default';
    localStorage.setItem(`tester_authToken${suffix}`, authToken);
  }, [authToken, specId]);

  useEffect(() => {
    const suffix = specId ? `_${specId}` : '_default';
    localStorage.setItem(`tester_customHeaders${suffix}`, customHeaders);
  }, [customHeaders, specId]);

  useEffect(() => {
    const suffix = specId ? `_${specId}` : '_default';
    localStorage.setItem(`tester_preMethod${suffix}`, preMethod);
  }, [preMethod, specId]);

  useEffect(() => {
    const suffix = specId ? `_${specId}` : '_default';
    localStorage.setItem(`tester_preEndpoint${suffix}`, preEndpoint);
  }, [preEndpoint, specId]);

  useEffect(() => {
    const suffix = specId ? `_${specId}` : '_default';
    localStorage.setItem(`tester_prePayload${suffix}`, prePayload);
  }, [prePayload, specId]);

  useEffect(() => {
    const suffix = specId ? `_${specId}` : '_default';
    localStorage.setItem(`tester_preExtractKey${suffix}`, preExtractKey);
  }, [preExtractKey, specId]);

  useEffect(() => {
    const suffix = specId ? `_${specId}` : '_default';
    localStorage.setItem(`tester_runPreEverytime${suffix}`, String(runPreEverytime));
  }, [runPreEverytime, specId]);

  useEffect(() => {
    if (selectedEndpoint) {
      const suffix = specId ? `_${specId}` : '_default';
      localStorage.setItem(`tester_selectedEndpointId${suffix}`, selectedEndpoint.id);
    }
  }, [selectedEndpoint, specId]);

  useEffect(() => {
    Promise.all([
      fetchMappings().then(setMappings).catch(() => {}),
      fetchDatasets().then(setDatasets).catch(() => {}),
    ]);
  }, []);

  const loadScenarios = async (endpointId: string) => {
    if (!selectedEndpoint) return;
    setIsScenariosLoading(true);
    try {
      const [list, fetchedDatasets, fetchedMappings] = await Promise.all([
        fetchCustomScenarios(endpointId).catch(() => []),
        fetchDatasets().catch(() => []),
        fetchMappings().catch(() => []),
      ]);
      setScenarios(Array.isArray(list) ? list : []);
      setDatasets(fetchedDatasets);
      setMappings(fetchedMappings);
    } catch (err: any) {
      toast.error(`Failed to load scenarios: ${err.message}`);
    } finally {
      setIsScenariosLoading(false);
    }
  };

  // Load scenarios when endpoint changes
  useEffect(() => {
    if (!selectedEndpoint) {
      setScenarios([]);
      setGeneratedScenarios([]);
      setSelectedScenarios(new Set());
      setEditingScenario(null);
      return;
    }

    setSelectedScenarios(new Set());
    setGeneratedScenarios([]);
    setEditingScenario(null);
    loadScenarios(selectedEndpoint.id);
  }, [selectedEndpoint]);

  // Keep selected endpoint in sync if the endpoints list changes (e.g. after spec import)
  useEffect(() => {
    if (endpoints.length > 0 && !selectedEndpoint) {
      setSelectedEndpoint(endpoints[0]);
    }
  }, [endpoints, selectedEndpoint]);

  // Filter endpoints
  const filteredEndpoints = endpoints.filter((endpoint) => {
    const matchesSearch =
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = methodFilter === 'ALL' || endpoint.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const handleRunAllScenarios = async () => {
    const allList = [...scenarios, ...generatedScenarios];
    if (!selectedEndpoint || allList.length === 0) return;

    setIsExecuting(true);
    const newResults: ExecutionResult[] = [];

    const headers = {
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      ...parseHeaders(customHeaders),
    };
    const prerequisites = (preEndpoint && runPreEverytime) ? [
      {
        method: preMethod,
        endpoint: preEndpoint,
        payload: parsePayload(prePayload),
        extractVariableKey: preExtractKey || undefined,
      }
    ] : undefined;

    for (const scenario of allList) {
      try {
        const result = await executeTest({
          baseUrl,
          endpoint: selectedEndpoint.path,
          method: selectedEndpoint.method,
          payload: scenario.payload ?? {},
          scenarioName: scenario.scenarioName,
          generationRule: scenario.generationRule,
          headers,
          prerequisites,
        });
        newResults.push(result);
      } catch {
        toast.error(`Failed to execute "${scenario.scenarioName}"`);
      }
    }

    setExecutionResults((prev) => [...newResults, ...prev]);
    setIsExecuting(false);
    toast.success(`Executed ${newResults.length} scenario${newResults.length !== 1 ? 's' : ''}`);
    if (selectedEndpoint) {
      loadEndpointHistory(selectedEndpoint.path, selectedEndpoint.method);
    }
  };

  const handleRunSelected = async () => {
    if (!selectedEndpoint || selectedScenarios.size === 0) return;

    setIsExecuting(true);
    const newResults: ExecutionResult[] = [];
    
    const selectedList: Scenario[] = [];
    
    // Saved scenarios
    scenarios.forEach((s, idx) => {
      if (selectedScenarios.has(`saved-${idx}`)) {
        selectedList.push(s);
      }
    });
    
    // Generated scenarios
    generatedScenarios.forEach((s, idx) => {
      if (selectedScenarios.has(`gen-${idx}`)) {
        selectedList.push(s);
      }
    });

    const headers = {
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      ...parseHeaders(customHeaders),
    };
    const prerequisites = (preEndpoint && runPreEverytime) ? [
      {
        method: preMethod,
        endpoint: preEndpoint,
        payload: parsePayload(prePayload),
        extractVariableKey: preExtractKey || undefined,
      }
    ] : undefined;

    for (const scenario of selectedList) {
      try {
        const result = await executeTest({
          baseUrl,
          endpoint: selectedEndpoint.path,
          method: selectedEndpoint.method,
          payload: scenario.payload ?? {},
          scenarioName: scenario.scenarioName,
          generationRule: scenario.generationRule,
          headers,
          prerequisites,
        });
        newResults.push(result);
      } catch {
        toast.error(`Failed to execute "${scenario.scenarioName}"`);
      }
    }

    setExecutionResults((prev) => [...newResults, ...prev]);
    setIsExecuting(false);
    toast.success(`Executed ${newResults.length} scenario${newResults.length !== 1 ? 's' : ''}`);
    if (selectedEndpoint) {
      loadEndpointHistory(selectedEndpoint.path, selectedEndpoint.method);
    }
  };

  const kpiData = useMemo(() => {
    const passed = executionResults.filter((r) => r.passed).length;
    const failed = executionResults.length - passed;
    const avgLatency =
      executionResults.length > 0
        ? Math.round(
            executionResults.reduce((sum, r) => sum + r.responseTimeMs, 0) / executionResults.length
          )
        : 0;
    return { passed, failed, avgLatency };
  }, [executionResults]);

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Column 1: API Explorer Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search endpoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-endpoints"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((method) => (
              <Button
                key={method}
                variant={methodFilter === method ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setMethodFilter(method)}
                data-testid={`button-filter-${method.toLowerCase()}`}
              >
                {method}
              </Button>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {filteredEndpoints.map((endpoint) => (
              <EndpointCard
                key={endpoint.id}
                endpoint={endpoint}
                isActive={selectedEndpoint?.id === endpoint.id}
                onClick={() => setSelectedEndpoint(endpoint)}
              />
            ))}
            {filteredEndpoints.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-no-endpoints">
                No endpoints found
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Column 2: Request Studio */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="p-4 border-b border-border space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Target Base URL
            </label>
            <div className="flex gap-2">
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="font-mono text-sm flex-1"
                data-testid="input-base-url"
              />
              {specId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const loadingToast = toast.loading('Saving Base URL to database...');
                    try {
                      await updateWorkspaceBaseUrl(specId, baseUrl);
                      toast.dismiss(loadingToast);
                      toast.success('Base URL saved to database!');
                    } catch (err: any) {
                      toast.dismiss(loadingToast);
                      toast.error(err.message || 'Failed to save base URL.');
                    }
                  }}
                  className="h-9 px-3 text-xs bg-slate-50 hover:bg-slate-100 font-semibold"
                >
                  <Save className="h-4 w-4 text-slate-500 mr-1.5" />
                  Save to DB
                </Button>
              )}
            </div>
          </div>
          {selectedEndpoint && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MethodBadge method={selectedEndpoint.method} />
                <code className="text-sm font-mono font-semibold" data-testid="text-selected-path">
                  {selectedEndpoint.path}
                </code>
                <span className="text-xs text-muted-foreground">{selectedEndpoint.summary}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRunSelected}
                  disabled={isExecuting || selectedScenarios.size === 0}
                  data-testid="button-execute-selected"
                >
                  {isExecuting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Execute Selected
                </Button>
                <Button
                  size="sm"
                  onClick={handleRunAllScenarios}
                  disabled={isExecuting || scenarios.length === 0}
                  data-testid="button-run-all"
                >
                  {isExecuting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4 mr-2" />
                  )}
                  Run All Scenarios
                </Button>
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {selectedEndpoint ? (
              <>
                {/* Headers, Auth, & Prerequisite Settings */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl">
                  <div
                    className="p-3 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-indigo-500 animate-spin-slow" />
                      <span className="text-xs font-bold text-slate-700">Headers, Authentication & Prerequisites Setup</span>
                      {(authToken || customHeaders || preEndpoint) && (
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Active Configurations
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {showSettings ? 'Hide Settings' : 'Show Settings'}
                    </span>
                  </div>

                  {showSettings && (
                    <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-2 gap-4">
                      {/* Left Column: Headers & Auth */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-indigo-500" /> Credentials & Request Headers
                        </h4>
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                              Bearer Token (Authorization Header)
                            </label>
                            <Input
                              type="password"
                              placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                              value={authToken}
                              onChange={(e) => setAuthToken(e.target.value)}
                              className="text-xs h-9"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                              Custom Headers (JSON or Key: Value lines)
                            </label>
                            <Textarea
                              placeholder={`X-Tenant-Id: ALPHA\nContent-Type: application/json`}
                              value={customHeaders}
                              onChange={(e) => setCustomHeaders(e.target.value)}
                              className="text-xs min-h-[80px] font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Prerequisites */}
                      <div className="space-y-3 border-l border-slate-100 pl-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5 text-indigo-500" /> Prerequisite Step (Token Extraction)
                        </h4>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-1">
                              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                                Method
                              </label>
                              <select
                                className="w-full text-xs h-9 border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                value={preMethod}
                                onChange={(e: any) => setPreMethod(e.target.value)}
                              >
                                <option value="POST">POST</option>
                                <option value="GET">GET</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                                Prerequisite Endpoint
                              </label>
                              <Input
                                placeholder="e.g. /auth/login"
                                value={preEndpoint}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPreEndpoint(val);
                                  const matchingEp = endpoints.find(ep => ep.path === val);
                                  if (matchingEp) {
                                    setPreMethod(matchingEp.method as 'POST' | 'GET');
                                  }
                                }}
                                className="text-xs h-9"
                                list="prereq-endpoints"
                              />
                              <datalist id="prereq-endpoints">
                                {endpoints.map((ep) => (
                                  <option key={`${ep.method}-${ep.path}`} value={ep.path}>
                                    {ep.method} {ep.path} ({ep.summary})
                                  </option>
                                ))}
                              </datalist>
                            </div>
                          </div>

                          {preEndpoint && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                                    Extract Token Key
                                  </label>
                                  <Input
                                    placeholder="e.g. access_token"
                                    value={preExtractKey}
                                    onChange={(e) => setPreExtractKey(e.target.value)}
                                    className="text-xs h-9"
                                  />
                                </div>
                                <div className="flex items-end text-[10px] text-amber-600 font-medium pb-2">
                                  Injected as Bearer token into main header
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                                  Prerequisite JSON Payload
                                </label>
                                <Textarea
                                  value={prePayload}
                                  onChange={(e) => setPrePayload(e.target.value)}
                                  className="text-xs min-h-[80px] font-mono"
                                />
                              </div>
                              <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    id="runPreEverytime"
                                    checked={runPreEverytime}
                                    onChange={(e) => setRunPreEverytime(e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <label htmlFor="runPreEverytime" className="text-[10px] text-slate-600 font-semibold cursor-pointer">
                                    Run automatically on every request
                                  </label>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold"
                                  onClick={async () => {
                                    const loadingToast = toast.loading('Running prerequisite login to fetch token...');
                                    try {
                                      const result = await executeTest({
                                        baseUrl,
                                        endpoint: preEndpoint,
                                        method: preMethod,
                                        payload: parsePayload(prePayload),
                                        scenarioName: 'Prerequisite Fetch',
                                        generationRule: 'manual',
                                      });
                                      if (result.statusCode >= 200 && result.statusCode < 300) {
                                        const resBody = result.responseBody;
                                        const token = resBody[preExtractKey] || 
                                                      (resBody.data && resBody.data[preExtractKey]);
                                        if (token) {
                                          setAuthToken(token);
                                          toast.dismiss(loadingToast);
                                          toast.success('Successfully logged in & populated Bearer token!');
                                        } else {
                                          toast.dismiss(loadingToast);
                                          toast.error(`Key "${preExtractKey}" not found in response.`);
                                        }
                                      } else {
                                        toast.dismiss(loadingToast);
                                        toast.error(`Login failed with status ${result.statusCode}`);
                                      }
                                    } catch (err: any) {
                                      toast.dismiss(loadingToast);
                                      toast.error(`Prerequisite run failed: ${err.message}`);
                                    }
                                  }}
                                >
                                  🔑 Fetch Token Now
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                <Tabs defaultValue="scenarios">
                  <TabsList>
                    <TabsTrigger value="scenarios" data-testid="tab-scenarios">Scenario Suite</TabsTrigger>
                    <TabsTrigger value="payload" data-testid="tab-payload">JSON Payload Editor</TabsTrigger>
                  </TabsList>
                  <TabsContent value="scenarios" className="space-y-4 mt-4">
                  {/* Action Bar for AI Generation and Manual Adding */}
                  <div className="flex gap-2 items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Manage your test suite for this endpoint:
                    </span>
                    <Button
                      size="sm"
                      disabled={isGenerating}
                      className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm"
                      onClick={async () => {
                        if (!selectedEndpoint) return;
                        setIsGenerating(true);
                        const loadingToast = toast.loading('Generating AI test cases...');
                        try {
                          const res = await generateScenarios(
                            selectedEndpoint.requestSchema ?? {},
                            selectedEndpoint.summary
                          );
                          if (res && res.length > 0) {
                            setGeneratedScenarios(res);
                            toast.dismiss(loadingToast);
                            toast.success(`Generated ${res.length} test cases with ${aiModel}!`);
                          }
                        } catch {
                          toast.dismiss(loadingToast);
                          toast.error('Failed to generate scenarios using local AI.');
                        } finally {
                          setIsGenerating(false);
                        }
                      }}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {isGenerating ? 'Generating AI Scenarios...' : '✨ Generate AI Test Cases'}
                    </Button>
                  </div>

                  {/* Custom Test Case Form */}
                  <Card className="p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <PlusCircle className="h-4 w-4 text-indigo-500" />
                      Add Custom Test Case
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Scenario Name (e.g. Invalid UUID)"
                        value={newScenarioName}
                        onChange={(e) => setNewScenarioName(e.target.value)}
                        className="text-xs h-9 bg-white"
                      />
                      <Input
                        placeholder="Expected Result (e.g. 400 Bad Request)"
                        value={newExpectedResult}
                        onChange={(e) => setNewExpectedResult(e.target.value)}
                        className="text-xs h-9 bg-white"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        className="text-xs h-8 px-3"
                        onClick={async () => {
                          if (!selectedEndpoint) return;
                          if (!newScenarioName.trim()) {
                            toast.error('Please enter a scenario name');
                            return;
                          }
                          try {
                            const basePayload = scenarios[0]?.payload || {};
                            await saveCustomScenario({
                              endpointId: selectedEndpoint.id,
                              scenarioName: newScenarioName,
                              expectedResult: newExpectedResult || '200 OK',
                              payload: basePayload,
                              generationRule: 'manual',
                            });
                            setNewScenarioName('');
                            setNewExpectedResult('');
                            toast.success('Custom test case saved to PostgreSQL!');
                            loadScenarios(selectedEndpoint.id);
                          } catch {
                            toast.error('Failed to save custom test case.');
                          }
                        }}
                      >
                        Save Test Case
                      </Button>
                    </div>
                  </Card>

                  {/* Generated AI Scenarios (Unsaved) */}
                  {generatedScenarios.length > 0 && (
                    <div className="pt-2 border-t border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                          Generated AI Test Cases ({generatedScenarios.length} Unsaved)
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setGeneratedScenarios([])}
                          >
                            Discard All
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold"
                            onClick={async () => {
                              const loadingToast = toast.loading('Saving all generated scenarios to database...');
                              try {
                                for (const gs of generatedScenarios) {
                                  await saveCustomScenario({
                                    endpointId: selectedEndpoint.id,
                                    scenarioName: gs.scenarioName,
                                    expectedResult: gs.expectedResult,
                                    payload: gs.payload,
                                    generationRule: gs.generationRule,
                                  });
                                }
                                toast.dismiss(loadingToast);
                                toast.success('Saved all generated scenarios to PostgreSQL!');
                                setGeneratedScenarios([]);
                                loadScenarios(selectedEndpoint.id);
                              } catch {
                                toast.dismiss(loadingToast);
                                toast.error('Failed to save some scenarios.');
                              }
                            }}
                          >
                            Save All to Suite
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {generatedScenarios.map((scenario, idx) => (
                          <ScenarioCard
                            key={`gen-${idx}`}
                            scenario={scenario}
                            isSelected={selectedScenarios.has(`gen-${idx}`)}
                            onToggle={(selected) => {
                              const newSelected = new Set(selectedScenarios);
                              if (selected) {
                                newSelected.add(`gen-${idx}`);
                              } else {
                                newSelected.delete(`gen-${idx}`);
                              }
                              setSelectedScenarios(newSelected);
                            }}
                            onLoadIntoEditor={() => {
                              setCustomPayload(JSON.stringify(scenario.payload || {}, null, 2));
                              setEditingScenario(scenario);
                              toast.success(`Loaded "${scenario.scenarioName}" into JSON Editor for editing`);
                            }}
                            onSave={async () => {
                              try {
                                await saveCustomScenario({
                                  endpointId: selectedEndpoint.id,
                                  scenarioName: scenario.scenarioName,
                                  expectedResult: scenario.expectedResult,
                                  payload: scenario.payload,
                                  generationRule: scenario.generationRule,
                                });
                                toast.success(`Saved "${scenario.scenarioName}" to database!`);
                                setGeneratedScenarios((prev) => prev.filter((_, i) => i !== idx));
                                const newSelected = new Set(selectedScenarios);
                                newSelected.delete(`gen-${idx}`);
                                setSelectedScenarios(newSelected);
                                loadScenarios(selectedEndpoint.id);
                              } catch {
                                toast.error('Failed to save scenario.');
                              }
                            }}
                            onUpdatePayload={async (updatedPayload) => {
                              setGeneratedScenarios((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, payload: updatedPayload } : s))
                              );
                              // If this scenario is currently being edited in the raw JSON editor, keep it in sync!
                              if (editingScenario?.scenarioName === scenario.scenarioName) {
                                setCustomPayload(JSON.stringify(updatedPayload, null, 2));
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Saved Test Cases Section */}
                  <div className="pt-2 border-t border-border space-y-3">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Saved Test Cases Suite ({scenarios.length})
                    </span>

                    {isScenariosLoading ? (
                      <Card className="p-8 flex items-center justify-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Loading test suite...</span>
                      </Card>
                    ) : scenarios.length > 0 ? (
                      scenarios.map((scenario, idx) => (
                        <ScenarioCard
                          key={idx}
                          scenario={scenario}
                          isSelected={selectedScenarios.has(`saved-${idx}`)}
                          onToggle={(selected) => {
                            const newSelected = new Set(selectedScenarios);
                            if (selected) {
                              newSelected.add(`saved-${idx}`);
                            } else {
                              newSelected.delete(`saved-${idx}`);
                            }
                            setSelectedScenarios(newSelected);
                          }}
                          onLoadIntoEditor={() => {
                            setCustomPayload(JSON.stringify(scenario.payload || {}, null, 2));
                            setEditingScenario(scenario);
                            toast.success(`Loaded "${scenario.scenarioName}" into JSON Editor for editing`);
                          }}
                          onDelete={async () => {
                            if (scenario.id) {
                              try {
                                await deleteCustomScenario(scenario.id);
                                toast.success('Deleted test case from database.');
                                loadScenarios(selectedEndpoint.id);
                              } catch {
                                toast.error('Failed to delete custom scenario.');
                              }
                            }
                          }}
                          onUpdatePayload={async (updatedPayload) => {
                            await saveCustomScenario({
                              endpointId: selectedEndpoint.id,
                              scenarioName: scenario.scenarioName,
                              expectedResult: scenario.expectedResult,
                              payload: updatedPayload,
                              generationRule: scenario.generationRule,
                            });
                            // If this scenario is currently being edited in the raw JSON editor, keep it in sync!
                            if (editingScenario?.scenarioName === scenario.scenarioName) {
                              setCustomPayload(JSON.stringify(updatedPayload, null, 2));
                            }
                            loadScenarios(selectedEndpoint.id);
                          }}
                        />
                      ))
                    ) : (
                      <Card className="p-8 text-center" data-testid="card-no-scenarios">
                        <p className="text-muted-foreground text-sm">
                          No saved test cases in PostgreSQL for this endpoint. Click "Generate AI Test Cases" or create one manually!
                        </p>
                      </Card>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="payload" className="mt-4 space-y-4">
                  {selectedEndpoint?.requestSchema?.properties && (
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3 shadow-sm">
                      <div className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                        <Cpu className="h-4 w-4 text-indigo-600 animate-pulse" />
                        AI Smart Mapping Suggestions:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(selectedEndpoint.requestSchema.properties).map((field) => {
                          const matchingMapping = mappings.find(
                            (m) => m.sourceField.toLowerCase() === field.toLowerCase()
                          );
                          if (matchingMapping) {
                            return (
                              <Button
                                key={field}
                                variant="outline"
                                size="sm"
                                className="text-xs bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                                onClick={() => {
                                  try {
                                    const current = JSON.parse(customPayload);
                                    const parts = matchingMapping.targetMapping.split('.');
                                    const dsName = parts[0];
                                    const fName = parts[1];
                                    
                                    const targetDs = datasets.find(d => d.datasetName.toLowerCase() === dsName.toLowerCase());
                                    const firstRecord = targetDs?.records?.[0];
                                    const extractedValue = firstRecord?.[fName] !== undefined 
                                      ? firstRecord[fName] 
                                      : (firstRecord?.id || 'TEST-VAL');
                                    
                                    current[field] = extractedValue;
                                    setCustomPayload(JSON.stringify(current, null, 2));
                                    toast.success(`Injected dynamic value: "${extractedValue}" into field "${field}"`);
                                  } catch {
                                    toast.error('Invalid JSON structure inside payload editor. Fix syntax errors first.');
                                  }
                                }}
                              >
                                Suggest: {field} ➔ {matchingMapping.targetMapping}
                              </Button>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-5 gap-4 items-stretch">
                    <Card className="p-4 col-span-3 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <Terminal className="h-3.5 w-3.5" /> Raw JSON request body
                            </span>
                            {editingScenario && (
                              <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 animate-pulse flex items-center gap-1">
                                <span>Editing: {editingScenario.scenarioName}</span>
                                <button
                                  className="text-amber-800 hover:text-amber-950 font-bold ml-1"
                                  onClick={() => {
                                    setEditingScenario(null);
                                    setCustomPayload('{\n  \n}');
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {editingScenario && (
                              <Button
                                size="sm"
                                className="h-8 text-xs flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
                                onClick={async () => {
                                  if (!selectedEndpoint) return;
                                  try {
                                    const parsedPayload = JSON.parse(customPayload);
                                    if (editingScenario.generationRule === 'manual') {
                                      // Update manually saved one in PostgreSQL
                                      await saveCustomScenario({
                                        endpointId: selectedEndpoint.id,
                                        scenarioName: editingScenario.scenarioName,
                                        expectedResult: editingScenario.expectedResult,
                                        payload: parsedPayload,
                                        generationRule: 'manual',
                                      });
                                      toast.success(`Updated saved scenario "${editingScenario.scenarioName}"`);
                                      loadScenarios(selectedEndpoint.id);
                                    } else {
                                      // It is an unsaved generated AI scenario, update it in memory!
                                      setGeneratedScenarios((prev) =>
                                        prev.map((s) =>
                                          s.scenarioName === editingScenario.scenarioName
                                            ? { ...s, payload: parsedPayload }
                                            : s
                                        )
                                      );
                                      toast.success(`Updated unsaved scenario "${editingScenario.scenarioName}" in workspace`);
                                    }
                                  } catch {
                                    toast.error('Invalid JSON structure inside payload editor.');
                                  }
                                }}
                              >
                                <Save className="h-3.5 w-3.5" /> Save Changes
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs flex items-center gap-1"
                              onClick={async () => {
                                if (!selectedEndpoint) return;
                                const name = prompt(
                                  'Enter a name for this custom scenario:',
                                  editingScenario ? `${editingScenario.scenarioName} (Copy)` : ''
                                );
                                if (!name) return;
                                const expected = prompt('Enter expected response status (e.g. 200 OK):') || '200 OK';
                                try {
                                  const parsedPayload = JSON.parse(customPayload);
                                  await saveCustomScenario({
                                    endpointId: selectedEndpoint.id,
                                    scenarioName: name,
                                    expectedResult: expected,
                                    payload: parsedPayload,
                                    generationRule: 'manual',
                                  });
                                  toast.success(`Saved custom scenario "${name}" to database`);
                                  setEditingScenario(null);
                                  loadScenarios(selectedEndpoint.id);
                                } catch {
                                  toast.error('Invalid JSON structure inside payload editor. Fix errors first.');
                                }
                              }}
                            >
                              <Save className="h-3.5 w-3.5 text-emerald-500" /> Save as New
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs flex items-center gap-1"
                              onClick={async () => {
                                if (!selectedEndpoint) return;
                                const loadingToast = toast.loading('Generating AI payload...');
                                try {
                                  const list = await fetchCustomScenarios(selectedEndpoint.id).catch(() => []);
                                  let aiScenario = list.find((s: any) => s.generationRule === 'ai_enriched');
                                  
                                  if (!aiScenario) {
                                    const genList = await generateScenarios(
                                      selectedEndpoint.requestSchema ?? {},
                                      selectedEndpoint.summary
                                    );
                                    aiScenario = genList.find((s: any) => s.generationRule === 'ai_enriched') || genList[genList.length - 1];
                                  }

                                  if (aiScenario) {
                                    setCustomPayload(JSON.stringify(aiScenario.payload || {}, null, 2));
                                    toast.dismiss(loadingToast);
                                    toast.success(`Generated payload with ${aiModel}`);
                                  } else {
                                    toast.dismiss(loadingToast);
                                    toast.error('No AI-enriched scenario found.');
                                  }
                                } catch {
                                  toast.dismiss(loadingToast);
                                  toast.error('Failed to connect to local AI generator.');
                                }
                              }}
                            >
                              <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Generate AI Payload
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          value={customPayload}
                          onChange={(e) => setCustomPayload(e.target.value)}
                          className="font-mono text-xs min-h-[350px] resize-none border-slate-200"
                          data-testid="textarea-custom-payload"
                        />
                      </div>
                      <div className="flex justify-end pt-3 mt-3 border-t border-slate-100">
                        <Button
                          size="sm"
                          disabled={isExecuting}
                          className="h-9 text-xs flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold"
                          onClick={async () => {
                            if (!selectedEndpoint) return;
                            setIsExecuting(true);
                            const loadingToast = toast.loading('Running custom test payload...');
                            try {
                              const parsedPayload = JSON.parse(customPayload);
                              const result = await executeTest({
                                baseUrl,
                                endpoint: selectedEndpoint.path,
                                method: selectedEndpoint.method,
                                payload: parsedPayload,
                                scenarioName: editingScenario ? `Edit: ${editingScenario.scenarioName}` : 'Custom Editor Run',
                                generationRule: editingScenario ? editingScenario.generationRule : 'manual',
                                headers: {
                                  ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
                                  ...parseHeaders(customHeaders),
                                },
                                prerequisites: (preEndpoint && runPreEverytime) ? [
                                  {
                                    method: preMethod,
                                    endpoint: preEndpoint,
                                    payload: parsePayload(prePayload),
                                    extractVariableKey: preExtractKey || undefined,
                                  }
                                ] : undefined,
                              });
                              setExecutionResults((prev) => [result, ...prev]);
                              if (selectedEndpoint) {
                                loadEndpointHistory(selectedEndpoint.path, selectedEndpoint.method);
                              }
                              toast.dismiss(loadingToast);
                              toast.success('Test run completed! View details in Execution Console.');
                            } catch (err: any) {
                              toast.dismiss(loadingToast);
                              toast.error(`Run failed: ${err.message || 'Invalid JSON syntax'}`);
                            } finally {
                              setIsExecuting(false);
                            }
                          }}
                        >
                          {isExecuting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          Run Custom Test
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-4 col-span-2 bg-slate-50 border-slate-200 flex flex-col h-full justify-between">
                      <div className="space-y-3 flex-1 flex flex-col">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                            Swagger Schema Example
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold"
                            onClick={() => {
                              const exampleStr = generateExampleFromSchema(selectedEndpoint?.requestSchema);
                              setCustomPayload(exampleStr);
                              toast.success('Copied schema example to editor!');
                            }}
                          >
                            📋 Load to Editor
                          </Button>
                        </div>
                        <ScrollArea className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-3 min-h-[300px]">
                          <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap">
                            {generateExampleFromSchema(selectedEndpoint?.requestSchema)}
                          </pre>
                        </ScrollArea>
                      </div>
                      <div className="text-[10px] text-slate-500 pt-3 border-t border-slate-200/60 leading-normal">
                        Based on parameters found in OpenAPI specification body schema. Click <strong>Load to Editor</strong> to copy-paste.
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
            ) : (
              <Card className="p-12 text-center" data-testid="card-no-endpoint-selected">
                <p className="text-muted-foreground">Select an endpoint to begin testing</p>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Column 3: Execution Console */}
      <div className="w-[420px] border-l border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Execution Console</h3>
            <div className="flex gap-1">
              {consoleTab === 'history' ? (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!selectedEndpoint) return;
                      const conf = confirm('Are you sure you want to clear all database test logs for this endpoint?');
                      if (!conf) return;
                      try {
                        await clearEndpointHistory(selectedEndpoint.path, selectedEndpoint.method);
                        toast.success('Database history cleared!');
                        loadEndpointHistory(selectedEndpoint.path, selectedEndpoint.method);
                      } catch {
                        toast.error('Failed to clear database logs.');
                      }
                    }}
                    className="h-8 text-xs flex items-center gap-1 text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear DB
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectedEndpoint && loadEndpointHistory(selectedEndpoint.path, selectedEndpoint.method)}
                    className="h-8 text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    <History className={`h-3.5 w-3.5 ${isHistoryLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExecutionResults([])}
                  data-testid="button-clear-console"
                  className="h-8 text-xs text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Console Tab Selector */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setConsoleTab('active')}
              className={`text-xs py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                consoleTab === 'active'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active Run ({executionResults.length})
            </button>
            <button
              onClick={() => setConsoleTab('history')}
              className={`text-xs py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                consoleTab === 'history'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              DB History ({historyResults.length})
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3 bg-emerald-50/70 border-emerald-200">
              <div className="text-xl font-bold text-emerald-700" data-testid="text-kpi-passed">
                {consoleTab === 'active'
                  ? kpiData.passed
                  : historyResults.filter((h) => h.passed).length}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Passed</div>
            </Card>
            <Card className="p-3 bg-rose-50/70 border-rose-200">
              <div className="text-xl font-bold text-rose-700" data-testid="text-kpi-failed">
                {consoleTab === 'active'
                  ? kpiData.failed
                  : historyResults.filter((h) => !h.passed).length}
              </div>
              <div className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider">Failed</div>
            </Card>
            <Card className="p-3 bg-indigo-50/70 border-indigo-200">
              <div className="text-xl font-bold text-indigo-700" data-testid="text-kpi-latency">
                {consoleTab === 'active'
                  ? `${kpiData.avgLatency}ms`
                  : historyResults.length > 0
                  ? `${Math.round(historyResults.reduce((sum, h) => sum + h.responseTimeMs, 0) / historyResults.length)}ms`
                  : '0ms'}
              </div>
              <div className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">Avg Latency</div>
            </Card>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {consoleTab === 'active' ? (
              <>
                {executionResults.map((result, idx) => (
                  <ExecutionResultCard key={idx} result={result} />
                ))}
                {executionResults.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-xs" data-testid="text-no-results">
                    No active run results yet. Click "Run Custom Test" or "Execute Selected" above.
                  </div>
                )}
              </>
            ) : (
              <>
                {isHistoryLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <>
                    {historyResults.map((h, idx) => {
                      const mockResult: ExecutionResult = {
                        statusCode: h.statusCode,
                        responseTimeMs: h.responseTimeMs,
                        passed: h.passed,
                        scenarioName: h.scenarioName || 'Database Run Log',
                        generationRule: h.generationRule || 'manual',
                        requestPayload: h.requestPayload || {},
                        responseBody: h.responseBody,
                        aiExplanation: h.aiExplanation,
                      };
                      return (
                        <div key={h.id || idx} className="relative group">
                          <div className="absolute right-3 top-3 flex items-center gap-1.5 z-10">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(h.executedAt || h.createdAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const conf = confirm('Delete this execution log from database?');
                                if (!conf) return;
                                try {
                                  await deleteExecutionLog(h.id);
                                  toast.success('Log deleted');
                                  if (selectedEndpoint) {
                                    loadEndpointHistory(selectedEndpoint.path, selectedEndpoint.method);
                                  }
                                } catch {
                                  toast.error('Failed to delete log');
                                }
                              }}
                              className="text-slate-300 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer group-hover:opacity-100 opacity-0 bg-white shadow-xs border border-slate-100"
                              title="Delete log from DB"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <ExecutionResultCard result={mockResult} />
                        </div>
                      );
                    })}
                    {historyResults.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground text-xs">
                        No database history logs found for this endpoint yet. Run some tests first!
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
