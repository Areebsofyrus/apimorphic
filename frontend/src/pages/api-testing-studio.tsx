import { useState, useEffect, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { VariableInput, VariableTextarea } from '@/components/ui/variable-input';
import { Badge } from '@/components/ui/badge';
import { Search, Play, PlayCircle, Trash2, Loader2, Cpu, Sparkles, Terminal, PlusCircle, Save, Settings, Key, History, Eye, EyeOff, Database, Menu, X, ArrowLeft } from 'lucide-react';
import { EndpointCard } from '@/components/endpoint-card';
import { ScenarioCard, HTTP_STATUS_DESCRIPTIONS } from '@/components/scenario-card';
import { ExecutionResultCard } from '@/components/execution-result-card';
import { MethodBadge } from '@/components/method-badge';
import { Endpoint, Scenario, ExecutionResult } from '@/types/api';
import { MOCK_SCENARIOS } from '@/lib/mock-data';
import { executeTest, generateScenarios, fetchMappings, fetchDatasets, fetchCustomScenarios, saveCustomScenario, deleteCustomScenario, updateWorkspaceBaseUrl, fetchEndpointHistory, clearEndpointHistory, deleteExecutionLog } from '@/lib/api-client';
import { toast } from 'sonner';

const DEFAULT_BASE_URL = (import.meta as any).env.VITE_TARGET_BASE_URL ?? 'https://httpbin.org';

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

const extractPathParams = (endpoint: Endpoint | null): string[] => {
  if (!endpoint) return [];
  if (endpoint.parameters) {
    const fromParams = endpoint.parameters
      .filter(p => p.in === 'path')
      .map(p => p.name);
    if (fromParams.length > 0) return fromParams;
  }
  const curlyMatches = (endpoint.path.match(/\{([^}]+)\}/g) || []).map(m => m.slice(1, -1));
  const colonMatches = (endpoint.path.match(/:([a-zA-Z0-9_]+)/g) || []).map(m => m.slice(1));
  return Array.from(new Set([...curlyMatches, ...colonMatches]));
};

const extractQueryParams = (endpoint: Endpoint | null): string[] => {
  if (!endpoint || !endpoint.parameters) return [];
  return endpoint.parameters
    .filter(p => p.in === 'query')
    .map(p => p.name);
};

const resolveEndpointPath = (
  path: string,
  pathParams: Record<string, string> = {},
  queryParams: Record<string, string> = {},
  profileVars: Record<string, string> = {}
): string => {
  if (!path) return path;
  let result = path;
  
  // 1. Substitute Path UI overrides first
  Object.entries(pathParams).forEach(([key, val]) => {
    if (val) {
      result = result.split(`{${key}}`).join(val);
      result = result.split(`:${key}`).join(val);
    }
  });
  
  // 2. Substitute profile variables next
  Object.entries(profileVars).forEach(([key, val]) => {
    result = result.split(`{${key}}`).join(String(val));
    result = result.split(`:${key}`).join(String(val));
    result = result.split(`{{${key}}}`).join(String(val));
  });

  // 3. Gather query parameters
  const qParams: string[] = [];
  Object.entries(queryParams).forEach(([key, val]) => {
    const finalVal = val !== undefined && val !== '' ? val : (profileVars[key] || '');
    if (finalVal) {
      qParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(finalVal)}`);
    }
  });

  if (qParams.length > 0) {
    const separator = result.includes('?') ? '&' : '?';
    result = `${result}${separator}${qParams.join('&')}`;
  }
  
  return result;
};

interface ApiTestingStudioProps {
  endpoints: Endpoint[];
  aiModel?: string;
  specId?: string;
  selectedEndpointId: string | null;
  onSelectedEndpointIdChange: (id: string | null) => void;
  geminiApiKey: string;
  profiles: Array<{ name: string; variables: Record<string, string> }>;
  activeProfileName: string;
  onProfilesChange: (profiles: Array<{ name: string; variables: Record<string, string> }>) => void;
  workspaceConfig?: {
    baseUrl?: string;
    authToken?: string;
    customHeaders?: string;
    preMethod?: 'GET' | 'POST';
    preEndpoint?: string;
    prePayload?: string;
    preExtractKey?: string;
    runPreEverytime?: boolean;
    showSettings?: boolean;
  };
  onWorkspaceConfigChange?: (config: any) => void;
  globalVariables?: Record<string, string>;
}

export default function ApiTestingStudio({
  endpoints,
  aiModel = '',
  specId,
  selectedEndpointId,
  onSelectedEndpointIdChange,
  geminiApiKey,
  profiles = [],
  activeProfileName = '',
  onProfilesChange,
  workspaceConfig,
  onWorkspaceConfigChange,
  globalVariables = {},
}: ApiTestingStudioProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [sidebarWidth, setSidebarWidth] = useState(320);

  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const selectedEndpoint = endpoints.find(e => e.id === selectedEndpointId) || endpoints[0] || null;
  const setSelectedEndpoint = (endpoint: Endpoint | null) => {
    onSelectedEndpointIdChange(endpoint?.id || null);
    if (isMobile) {
      setShowMobileSidebar(false);
    }
  };

  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isScenariosLoading, setIsScenariosLoading] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [customPayload, setCustomPayload] = useState('{\n  \n}');
  const [executionResultsCache, setExecutionResultsCache] = useState<Record<string, ExecutionResult[]>>({});
  const executionResults = selectedEndpoint ? (executionResultsCache[selectedEndpoint.id] || []) : [];
  const [isExecuting, setIsExecuting] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'active' | 'history'>('active');
  const [historyResults, setHistoryResults] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const lastLoadedSpecIdRef = useRef<string | null>(null);

  const activeProfile = profiles.find(p => p.name === activeProfileName);
  const vars = {
    ...(globalVariables || {}),
    ...(activeProfile ? activeProfile.variables : {}),
  };

  const substitute = (text: string): string => {
    if (!text) return text;
    let result = text;
    Object.entries(vars).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.split(placeholder).join(String(value));
    });
    return result;
  };

  const resolvePayload = (payload: any): any => {
    if (!payload) return payload;
    try {
      const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
      return JSON.parse(substitute(str));
    } catch {
      return payload;
    }
  };

  const resolveHeaders = (headers: Record<string, string>): Record<string, string> => {
    if (!headers) return headers;
    const result: Record<string, string> = {};
    Object.entries(headers).forEach(([k, v]) => {
      result[k] = substitute(v);
    });
    return result;
  };

  const updateGeneratedScenarios = (updater: Scenario[] | ((prev: Scenario[]) => Scenario[])) => {
    if (!selectedEndpoint) return;
    const endpointId = selectedEndpoint.id;
    setGeneratedScenarios((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setGeneratedScenariosCache((cache) => ({
        ...cache,
        [endpointId]: next,
      }));
      return next;
    });
  };

  const updateCustomPayload = (val: string) => {
    if (!selectedEndpoint) return;
    const endpointId = selectedEndpoint.id;
    setCustomPayload(val);
    setCustomPayloadCache((cache) => ({
      ...cache,
      [endpointId]: val,
    }));
  };

  const loadEndpointHistory = async (path: string, method: string) => {
    if (!specId) return;
    setIsHistoryLoading(true);
    try {
      const logs = await fetchEndpointHistory(path, method, specId);
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
  const [generatedScenariosCache, setGeneratedScenariosCache] = useState<Record<string, Scenario[]>>({});
  const [customPayloadCache, setCustomPayloadCache] = useState<Record<string, string>>({});
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newExpectedResult, setNewExpectedResult] = useState('');
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [showParams, setShowParams] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('studio_show_params');
      return saved !== 'false';
    }
    return true;
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [customHeaders, setCustomHeaders] = useState('');
  const [preMethod, setPreMethod] = useState<'POST' | 'GET'>('POST');
  const [preEndpoint, setPreEndpoint] = useState('');
  const [prePayload, setPrePayload] = useState('{\n  "username": "admin",\n  "password": "password"\n}');
  const [preExtractKey, setPreExtractKey] = useState('access_token');
  const [runPreEverytime, setRunPreEverytime] = useState(false);

  // Sync state values when specId/workspaceConfig changes
  useEffect(() => {
    if (!specId) {
      lastLoadedSpecIdRef.current = null;
      return;
    }

    // Only sync values from configuration when switching workspace specs
    if (lastLoadedSpecIdRef.current !== specId && workspaceConfig) {
      lastLoadedSpecIdRef.current = specId;
      setBaseUrl(workspaceConfig.baseUrl !== undefined && workspaceConfig.baseUrl !== null ? workspaceConfig.baseUrl : (endpoints[0]?.baseUrl || DEFAULT_BASE_URL));
      setAuthToken(workspaceConfig.authToken !== undefined && workspaceConfig.authToken !== null ? workspaceConfig.authToken : '');
      setCustomHeaders(workspaceConfig.customHeaders !== undefined && workspaceConfig.customHeaders !== null ? workspaceConfig.customHeaders : '');
      setPreMethod(workspaceConfig.preMethod || 'POST');
      setPreEndpoint(workspaceConfig.preEndpoint !== undefined && workspaceConfig.preEndpoint !== null ? workspaceConfig.preEndpoint : '');
      setPrePayload(workspaceConfig.prePayload !== undefined && workspaceConfig.prePayload !== null ? workspaceConfig.prePayload : '{\n  "username": "admin",\n  "password": "password"\n}');
      setPreExtractKey(workspaceConfig.preExtractKey !== undefined && workspaceConfig.preExtractKey !== null ? workspaceConfig.preExtractKey : 'access_token');
      setRunPreEverytime(workspaceConfig.runPreEverytime ?? false);
      setShowSettings(workspaceConfig.showSettings ?? false);
    } else if (lastLoadedSpecIdRef.current !== specId && !workspaceConfig) {
      lastLoadedSpecIdRef.current = specId;
      setBaseUrl(endpoints[0]?.baseUrl || DEFAULT_BASE_URL);
      setAuthToken('');
      setCustomHeaders('');
      setPreMethod('POST');
      setPreEndpoint('');
      setPrePayload('{\n  "username": "admin",\n  "password": "password"\n}');
      setPreExtractKey('access_token');
      setRunPreEverytime(false);
      setShowSettings(false);
    }
  }, [specId, workspaceConfig, endpoints]);

  // Sync changes back to PostgreSQL database with a 500ms debounce
  useEffect(() => {
    if (!specId) return;
    const timer = setTimeout(() => {
      onWorkspaceConfigChange?.({
        baseUrl,
        authToken,
        customHeaders,
        preMethod,
        preEndpoint,
        prePayload,
        preExtractKey,
        runPreEverytime,
        showSettings,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [
    specId,
    baseUrl,
    authToken,
    customHeaders,
    preMethod,
    preEndpoint,
    prePayload,
    preExtractKey,
    runPreEverytime,
    showSettings,
  ]);

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
    if (!selectedEndpoint || !specId) return;
    setIsScenariosLoading(true);
    try {
      const [list, fetchedDatasets, fetchedMappings] = await Promise.all([
        fetchCustomScenarios(endpointId, specId).catch(() => []),
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
      setCustomPayload('{\n  \n}');
      return;
    }

    setSelectedScenarios(new Set());
    setEditingScenario(null);
    loadScenarios(selectedEndpoint.id);

    // Restore custom payload from cache or schema
    const cachedPayload = customPayloadCache[selectedEndpoint.id];
    if (cachedPayload !== undefined) {
      setCustomPayload(cachedPayload);
    } else {
      setCustomPayload(
        selectedEndpoint.requestSchema
          ? generateExampleFromSchema(selectedEndpoint.requestSchema)
          : '{\n  \n}'
      );
    }

    // Restore generated scenarios from cache
    const cachedGenScenarios = generatedScenariosCache[selectedEndpoint.id];
    if (cachedGenScenarios !== undefined) {
      setGeneratedScenarios(cachedGenScenarios);
    } else {
      setGeneratedScenarios([]);
    }
  }, [selectedEndpoint]);

  // Sync profile variables to path parameters and query parameters input form
  useEffect(() => {
    if (selectedEndpoint) {
      const pParams = extractPathParams(selectedEndpoint);
      setPathParams((prev) => {
        const updated = { ...prev };
        pParams.forEach((p) => {
          if (!updated[p]) {
            updated[p] = vars[p] || '';
          }
        });
        return updated;
      });

      const qParams = extractQueryParams(selectedEndpoint);
      setQueryParams((prev) => {
        const updated = { ...prev };
        qParams.forEach((q) => {
          if (!updated[q]) {
            updated[q] = vars[q] || '';
          }
        });
        return updated;
      });
    }
  }, [activeProfileName, selectedEndpoint?.id]);

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

    const headers = resolveHeaders({
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      ...parseHeaders(substitute(customHeaders)),
    });
    const prerequisites = (preEndpoint && runPreEverytime) ? [
      {
        method: preMethod,
        endpoint: substitute(preEndpoint),
        payload: parsePayload(substitute(prePayload)),
        extractVariableKey: preExtractKey || undefined,
      }
    ] : undefined;

    for (const scenario of allList) {
      try {
        const result = await executeTest({
          workspaceId: specId || '',
          baseUrl: substitute(baseUrl),
          endpoint: resolveEndpointPath(
            selectedEndpoint.path,
            { ...pathParams, ...(scenario.pathParams || {}) },
            { ...queryParams, ...(scenario.queryParams || {}) },
            vars
          ),
          method: selectedEndpoint.method,
          payload: resolvePayload(scenario.payload ?? {}),
          scenarioName: scenario.scenarioName,
          generationRule: scenario.generationRule,
          expectedResult: scenario.expectedResult,
          headers,
          prerequisites,
          geminiApiKey: geminiApiKey || undefined,
        });
        newResults.push(result);
      } catch {
        toast.error(`Failed to execute "${scenario.scenarioName}"`);
      }
    }

    if (selectedEndpoint) {
      setExecutionResultsCache((cache) => ({
        ...cache,
        [selectedEndpoint.id]: [...newResults, ...(cache[selectedEndpoint.id] || [])]
      }));
    }
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

    const headers = resolveHeaders({
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      ...parseHeaders(substitute(customHeaders)),
    });
    const prerequisites = (preEndpoint && runPreEverytime) ? [
      {
        method: preMethod,
        endpoint: substitute(preEndpoint),
        payload: parsePayload(substitute(prePayload)),
        extractVariableKey: preExtractKey || undefined,
      }
    ] : undefined;

    for (const scenario of selectedList) {
      try {
        const result = await executeTest({
          workspaceId: specId || '',
          baseUrl: substitute(baseUrl),
          endpoint: resolveEndpointPath(
            selectedEndpoint.path,
            { ...pathParams, ...(scenario.pathParams || {}) },
            { ...queryParams, ...(scenario.queryParams || {}) },
            vars
          ),
          method: selectedEndpoint.method,
          payload: resolvePayload(scenario.payload ?? {}),
          scenarioName: scenario.scenarioName,
          generationRule: scenario.generationRule,
          expectedResult: scenario.expectedResult,
          headers,
          prerequisites,
          geminiApiKey: geminiApiKey || undefined,
        });
        newResults.push(result);
      } catch {
        toast.error(`Failed to execute "${scenario.scenarioName}"`);
      }
    }

    if (selectedEndpoint) {
      setExecutionResultsCache((cache) => ({
        ...cache,
        [selectedEndpoint.id]: [...newResults, ...(cache[selectedEndpoint.id] || [])]
      }));
    }
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
    <div className="flex h-[calc(100vh-8rem)] relative">
      {/* Column 1: API Explorer Sidebar */}
      <div 
        style={isMobile ? { width: '100%' } : { width: sidebarWidth }} 
        className={isMobile 
          ? `${showMobileSidebar ? 'fixed inset-0 z-50 bg-background flex flex-col w-full h-full' : 'hidden'}`
          : "border-r border-border bg-card flex flex-col shrink-0"
        }
      >
        {isMobile && (
          <div className="p-4 border-b border-border flex items-center justify-between bg-card">
            <span className="font-bold text-sm text-foreground">Select API Endpoint</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowMobileSidebar(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
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
      {/* Resizable drag handle */}
      {!isMobile && (
        <div
          className="w-1 cursor-col-resize hover:bg-indigo-500 bg-slate-200 transition-colors duration-150 shrink-0 select-none"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const newWidth = Math.max(220, Math.min(600, startWidth + (moveEvent.clientX - startX)));
              setSidebarWidth(newWidth);
            };
            const handleMouseUp = () => {
              window.removeEventListener('mousemove', handleMouseMove);
              window.removeEventListener('mouseup', handleMouseUp);
            };
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
          }}
        />
      )}

      {/* Column 2: Request Studio */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="p-4 border-b border-border space-y-4">
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center justify-between border-indigo-250 text-indigo-700 bg-indigo-50/20 font-semibold h-9 rounded-lg hover:bg-indigo-50/50"
              onClick={() => setShowMobileSidebar(true)}
            >
              <span className="flex items-center gap-1.5 text-xs">
                <Menu className="h-4 w-4 text-indigo-500" />
                Select / Change Endpoint
              </span>
              <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                {selectedEndpoint ? `${selectedEndpoint.method} ${selectedEndpoint.path}` : 'None'}
              </span>
            </Button>
          )}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Target Base URL
            </label>
            <div className="flex gap-2">
              <VariableInput
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                vars={vars}
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
                    <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <div className="relative">
                              <VariableInput
                                type={showToken ? "text" : "password"}
                                placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                value={authToken}
                                onChange={(e) => setAuthToken(e.target.value)}
                                vars={vars}
                                className="text-xs h-9 pr-10"
                              />
                              {authToken && (
                                <button
                                  type="button"
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 focus:outline-none cursor-pointer"
                                  onClick={() => setShowToken(!showToken)}
                                >
                                  {showToken ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                              Custom Headers (JSON or Key: Value lines)
                            </label>
                            <VariableTextarea
                              placeholder={`X-Tenant-Id: ALPHA\nContent-Type: application/json`}
                              value={customHeaders}
                              onChange={(e) => setCustomHeaders(e.target.value)}
                              vars={vars}
                              className="text-xs min-h-[80px] font-mono"
                            />
                          </div>
                          
                        </div>
                      </div>

                      {/* Right Column: Prerequisites */}
                      <div className="space-y-3 md:border-l border-slate-100 md:pl-4 pl-0 border-t md:border-t-0 pt-4 md:pt-0">
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
                                onChange={(e: any) => {
                                  const nextMethod = e.target.value;
                                  setPreMethod(nextMethod);
                                  const matchingEp = endpoints.find(
                                    ep => ep.path === preEndpoint && ep.method.toUpperCase() === nextMethod.toUpperCase()
                                  );
                                  if (matchingEp) {
                                    if (matchingEp.requestSchema) {
                                      setPrePayload(generateExampleFromSchema(matchingEp.requestSchema));
                                    } else {
                                      setPrePayload('{\n  \n}');
                                    }
                                  }
                                }}
                              >
                                <option value="POST">POST</option>
                                <option value="GET">GET</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                                Prerequisite Endpoint
                              </label>
                              <VariableInput
                                placeholder="e.g. /auth/login"
                                value={preEndpoint}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPreEndpoint(val);
                                  const postEp = endpoints.find(
                                    ep => ep.path === val && ep.method.toUpperCase() === 'POST'
                                  );
                                  const matchingEp = postEp || endpoints.find(ep => ep.path === val);
                                  if (matchingEp) {
                                    const nextMethod = matchingEp.method.toUpperCase() as 'POST' | 'GET';
                                    setPreMethod(nextMethod);
                                    if (matchingEp.requestSchema) {
                                      setPrePayload(generateExampleFromSchema(matchingEp.requestSchema));
                                    } else {
                                      setPrePayload('{\n  \n}');
                                    }
                                  }
                                }}
                                vars={vars}
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
                                <VariableTextarea
                                  value={prePayload}
                                  onChange={(e) => setPrePayload(e.target.value)}
                                  vars={vars}
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
                                        workspaceId: specId || '',
                                        baseUrl: substitute(baseUrl),
                                        endpoint: substitute(preEndpoint),
                                        method: preMethod,
                                        payload: parsePayload(substitute(prePayload)),
                                        scenarioName: 'Prerequisite Fetch',
                                        generationRule: 'manual',
                                        geminiApiKey: geminiApiKey || undefined,
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

                {selectedEndpoint && (extractPathParams(selectedEndpoint).length > 0 || extractQueryParams(selectedEndpoint).length > 0) && (
                  <Card className="p-4 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-3 shadow-xs">
                    <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        <Database className="h-4 w-4 text-indigo-500" /> URL Parameters (Path & Query)
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-indigo-650 hover:text-indigo-850 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-950/40 cursor-pointer flex items-center gap-1 font-semibold"
                        onClick={() => setShowParams(prev => {
                          localStorage.setItem('studio_show_params', String(!prev));
                          return !prev;
                        })}
                      >
                        {showParams ? '👁️ Hide Parameters' : '👁️ Show Parameters'}
                      </Button>
                    </div>

                    {showParams && (
                      <div className="space-y-4 pt-1">
                        {/* Path Parameters Section */}
                        {extractPathParams(selectedEndpoint).length > 0 && (
                          <div className="space-y-3">
                            <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider border-b border-blue-100 dark:border-blue-900 pb-1">
                              Path Parameters
                            </div>
                            <div className="flex flex-col gap-3">
                              {extractPathParams(selectedEndpoint).map((param) => {
                                const matchingMapping = mappings.find(
                                  m => m.endpointPath === selectedEndpoint.path && m.sourceField?.toLowerCase() === param.toLowerCase()
                                ) || mappings.find(
                                  m => m.sourceField?.toLowerCase() === param.toLowerCase()
                                );
                                
                                let suggestedValues: string[] = [];
                                if (matchingMapping) {
                                  const parts = matchingMapping.targetMapping.split('.');
                                  const dsName = parts[0];
                                  const fName = parts[1];
                                  const targetDs = datasets.find(d => d.datasetName.toLowerCase() === dsName.toLowerCase());
                                  suggestedValues = targetDs?.records?.map(
                                    (r: any) => String(r[fName] !== undefined ? r[fName] : (r.id || ''))
                                  ).filter(Boolean) || [];
                                }

                                return (
                                  <div key={`path-${param}`} className="space-y-1.5 p-3 bg-white dark:bg-slate-955 rounded-lg border border-slate-100 dark:border-slate-850 shadow-2xs">
                                    {/* Line 1: Name & Input */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                      <div className="flex items-center gap-1.5 w-full sm:w-40 shrink-0">
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{param}</span>
                                        <Badge variant="outline" className="text-[9px] font-bold bg-blue-50/65 text-blue-700 border-blue-100 px-1 py-0 h-4 uppercase shrink-0">Path</Badge>
                                      </div>
                                      <div className="flex-1">
                                        <VariableInput
                                          placeholder={`Path value...`}
                                          value={pathParams[param] || ''}
                                          onChange={(e) => setPathParams(prev => ({ ...prev, [param]: e.target.value }))}
                                          vars={vars}
                                          className="text-xs h-7.5 bg-slate-50/50"
                                        />
                                      </div>
                                    </div>
                                    {/* Line 2: Suggestions */}
                                    {suggestedValues.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:pl-42">
                                        <span className="text-slate-400 font-medium shrink-0">Suggestions:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {suggestedValues.slice(0, 5).map((val, idx) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              className="text-[9px] font-semibold bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-850 rounded px-1.5 py-0.5 cursor-pointer transition-colors"
                                              onClick={() => {
                                                setPathParams(prev => ({ ...prev, [param]: val }));
                                                toast.success(`Selected suggestion: "${val}"`);
                                              }}
                                            >
                                              {val}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Query Parameters Section */}
                        {extractQueryParams(selectedEndpoint).length > 0 && (
                          <div className="space-y-3">
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-b border-emerald-100 dark:border-emerald-900 pb-1">
                              Query Parameters
                            </div>
                            <div className="flex flex-col gap-3">
                              {extractQueryParams(selectedEndpoint).map((param) => {
                                const matchingMapping = mappings.find(
                                  m => m.endpointPath === selectedEndpoint.path && m.sourceField?.toLowerCase() === param.toLowerCase()
                                ) || mappings.find(
                                  m => m.sourceField?.toLowerCase() === param.toLowerCase()
                                );

                                let suggestedValues: string[] = [];
                                if (matchingMapping) {
                                  const parts = matchingMapping.targetMapping.split('.');
                                  const dsName = parts[0];
                                  const fName = parts[1];
                                  const targetDs = datasets.find(d => d.datasetName.toLowerCase() === dsName.toLowerCase());
                                  suggestedValues = targetDs?.records?.map(
                                    (r: any) => String(r[fName] !== undefined ? r[fName] : (r.id || ''))
                                  ).filter(Boolean) || [];
                                }

                                return (
                                  <div key={`query-${param}`} className="space-y-1.5 p-3 bg-white dark:bg-slate-955 rounded-lg border border-slate-100 dark:border-slate-850 shadow-2xs">
                                    {/* Line 1: Name & Input */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                      <div className="flex items-center gap-1.5 w-full sm:w-40 shrink-0">
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{param}</span>
                                        <Badge variant="outline" className="text-[9px] font-bold bg-emerald-50/65 text-emerald-700 border-emerald-100 px-1 py-0 h-4 uppercase shrink-0">Query</Badge>
                                      </div>
                                      <div className="flex-1">
                                        <VariableInput
                                          placeholder={`Query value...`}
                                          value={queryParams[param] || ''}
                                          onChange={(e) => setQueryParams(prev => ({ ...prev, [param]: e.target.value }))}
                                          vars={vars}
                                          className="text-xs h-7.5 bg-slate-50/50"
                                        />
                                      </div>
                                    </div>
                                    {/* Line 2: Suggestions */}
                                    {suggestedValues.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:pl-42">
                                        <span className="text-slate-400 font-medium shrink-0">Suggestions:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {suggestedValues.slice(0, 5).map((val, idx) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              className="text-[9px] font-semibold bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-850 rounded px-1.5 py-0.5 cursor-pointer transition-colors"
                                              onClick={() => {
                                                setQueryParams(prev => ({ ...prev, [param]: val }));
                                                toast.success(`Selected suggestion: "${val}"`);
                                              }}
                                            >
                                              {val}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )}

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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={isGenerating}
                        className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm font-semibold cursor-pointer"
                        onClick={async () => {
                          if (!selectedEndpoint) return;
                          setIsGenerating(true);
                          const loadingToast = toast.loading('Generating rule-based test cases...');
                          try {
                            const res = await generateScenarios(
                              selectedEndpoint.requestSchema ?? {},
                              selectedEndpoint.summary,
                              selectedEndpoint.path,
                              selectedEndpoint.method,
                              false,
                              geminiApiKey || undefined,
                              selectedEndpoint.parameters
                            );
                            if (res && res.length > 0) {
                              updateGeneratedScenarios(res);
                              toast.dismiss(loadingToast);
                              toast.success(`Generated ${res.length} test cases instantly!`);
                            }
                          } catch {
                            toast.dismiss(loadingToast);
                            toast.error('Failed to generate test cases.');
                          } finally {
                            setIsGenerating(false);
                          }
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate Test Cases (Instant)
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isGenerating}
                        className="text-xs h-8 bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700 flex items-center gap-1.5 shadow-sm font-semibold cursor-pointer"
                        onClick={async () => {
                          if (!selectedEndpoint) return;
                          setIsGenerating(true);
                          const loadingToast = toast.loading(`Enriching with AI (${aiModel})...`);
                          try {
                            const res = await generateScenarios(
                              selectedEndpoint.requestSchema ?? {},
                              selectedEndpoint.summary,
                              selectedEndpoint.path,
                              selectedEndpoint.method,
                              true,
                              geminiApiKey || undefined,
                              selectedEndpoint.parameters
                            );
                            if (res && res.length > 0) {
                              updateGeneratedScenarios(res);
                              toast.dismiss(loadingToast);
                              toast.success(`Generated ${res.length} AI-enriched test cases successfully!`);
                            }
                          } catch {
                            toast.dismiss(loadingToast);
                            toast.error('Failed to generate AI-enriched test cases.');
                          } finally {
                            setIsGenerating(false);
                          }
                        }}
                      >
                        <Cpu className="h-3.5 w-3.5" />
                        AI Deep Enrich (Slow)
                      </Button>
                    </div>
                  </div>

                  {/* Custom Test Case Form */}
                  <Card className="p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <PlusCircle className="h-4 w-4 text-indigo-500" />
                      Add Custom Test Case
                    </div>
                    <div className="grid grid-cols-2 gap-3 items-start">
                       <Input
                         placeholder="Scenario Name (e.g. Invalid UUID)"
                         value={newScenarioName}
                         onChange={(e) => setNewScenarioName(e.target.value)}
                         className="text-xs h-9 bg-white"
                       />
                       <div className="space-y-1">
                         <Input
                           placeholder="Expected Result (e.g. 400 Bad Request)"
                           value={newExpectedResult}
                           onChange={(e) => setNewExpectedResult(e.target.value)}
                           className="text-xs h-9 bg-white"
                         />
                         {HTTP_STATUS_DESCRIPTIONS[newExpectedResult.trim()] && (
                            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                              Matched: {HTTP_STATUS_DESCRIPTIONS[newExpectedResult.trim()]}
                            </span>
                          )}
                       </div>
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
                              workspaceId: specId || '',
                              endpointId: selectedEndpoint.id,
                              scenarioName: newScenarioName,
                              expectedResult: newExpectedResult || '200 OK',
                              payload: basePayload,
                              generationRule: 'manual',
                              pathParams,
                              queryParams,
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
                            onClick={() => updateGeneratedScenarios([])}
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
                                    workspaceId: specId || '',
                                    endpointId: selectedEndpoint.id,
                                    scenarioName: gs.scenarioName,
                                    expectedResult: gs.expectedResult,
                                    payload: gs.payload,
                                    generationRule: gs.generationRule,
                                    priority: gs.priority,
                                    category: gs.category,
                                    description: gs.description,
                                    assertions: gs.assertions,
                                    pathParams: gs.pathParams,
                                    queryParams: gs.queryParams,
                                  });
                                }
                                toast.dismiss(loadingToast);
                                toast.success('Saved all generated scenarios to PostgreSQL!');
                                updateGeneratedScenarios([]);
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
                              updateCustomPayload(JSON.stringify(scenario.payload || {}, null, 2));
                              setEditingScenario(scenario);
                              toast.success(`Loaded "${scenario.scenarioName}" into JSON Editor for editing`);
                            }}
                            onSave={async () => {
                              try {
                                await saveCustomScenario({
                                  workspaceId: specId || '',
                                  endpointId: selectedEndpoint.id,
                                  scenarioName: scenario.scenarioName,
                                  expectedResult: scenario.expectedResult,
                                  payload: scenario.payload,
                                  generationRule: scenario.generationRule,
                                  priority: scenario.priority,
                                  category: scenario.category,
                                  description: scenario.description,
                                  assertions: scenario.assertions,
                                  pathParams: scenario.pathParams,
                                  queryParams: scenario.queryParams,
                                });
                                toast.success(`Saved "${scenario.scenarioName}" to database!`);
                                updateGeneratedScenarios((prev) => prev.filter((_, i) => i !== idx));
                                const newSelected = new Set(selectedScenarios);
                                newSelected.delete(`gen-${idx}`);
                                setSelectedScenarios(newSelected);
                                loadScenarios(selectedEndpoint.id);
                              } catch {
                                toast.error('Failed to save scenario.');
                              }
                            }}
                            onUpdatePayload={async (updatedPayload, updatedExpected) => {
                              updateGeneratedScenarios((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, payload: updatedPayload, expectedResult: updatedExpected } : s))
                              );
                              // If this scenario is currently being edited in the raw JSON editor, keep it in sync!
                              if (editingScenario?.scenarioName === scenario.scenarioName) {
                                updateCustomPayload(JSON.stringify(updatedPayload, null, 2));
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
                            updateCustomPayload(JSON.stringify(scenario.payload || {}, null, 2));
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
                          onUpdatePayload={async (updatedPayload, updatedExpected) => {
                            await saveCustomScenario({
                              workspaceId: specId || '',
                              endpointId: selectedEndpoint.id,
                              scenarioName: scenario.scenarioName,
                              expectedResult: updatedExpected,
                              payload: updatedPayload,
                              generationRule: scenario.generationRule,
                              pathParams: scenario.pathParams,
                              queryParams: scenario.queryParams,
                            });
                            // If this scenario is currently being edited in the raw JSON editor, keep it in sync!
                            if (editingScenario?.scenarioName === scenario.scenarioName) {
                              updateCustomPayload(JSON.stringify(updatedPayload, null, 2));
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
                                    updateCustomPayload(JSON.stringify(current, null, 2));
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
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
                    <Card className="p-4 col-span-1 md:col-span-3 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                              <Terminal className="h-3.5 w-3.5" /> Raw JSON request body
                            </span>
                            {editingScenario && (
                              <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 animate-pulse flex items-center gap-1 shrink-0">
                                <span>Editing: {editingScenario.scenarioName}</span>
                                <button
                                  className="text-amber-800 hover:text-amber-950 font-bold ml-1 cursor-pointer"
                                  onClick={() => {
                                    setEditingScenario(null);
                                    updateCustomPayload('{\n  \n}');
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
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
                                        workspaceId: specId || '',
                                        endpointId: selectedEndpoint.id,
                                        scenarioName: editingScenario.scenarioName,
                                        expectedResult: editingScenario.expectedResult,
                                        payload: parsedPayload,
                                        generationRule: 'manual',
                                        pathParams: editingScenario.pathParams || pathParams,
                                        queryParams: editingScenario.queryParams || queryParams,
                                      });
                                      toast.success(`Updated saved scenario "${editingScenario.scenarioName}"`);
                                      loadScenarios(selectedEndpoint.id);
                                    } else {
                                      // It is an unsaved generated AI scenario, update it in memory!
                                      updateGeneratedScenarios((prev) =>
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
                                    workspaceId: specId || '',
                                    endpointId: selectedEndpoint.id,
                                    scenarioName: name,
                                    expectedResult: expected,
                                    payload: parsedPayload,
                                    generationRule: 'manual',
                                    pathParams: editingScenario?.pathParams || pathParams,
                                    queryParams: editingScenario?.queryParams || queryParams,
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
                                  const list = await fetchCustomScenarios(selectedEndpoint.id, specId || '').catch(() => []);
                                  let aiScenario = list.find((s: any) => s.generationRule === 'ai_enriched');
                                  
                                  if (!aiScenario) {
                                    const genList = await generateScenarios(
                                      selectedEndpoint.requestSchema ?? {},
                                      selectedEndpoint.summary,
                                      selectedEndpoint.path,
                                      selectedEndpoint.method,
                                      true,
                                      geminiApiKey || undefined,
                                      selectedEndpoint.parameters
                                    );
                                    aiScenario = genList.find((s: any) => s.generationRule === 'ai_enriched') || genList[genList.length - 1];
                                  }

                                  if (aiScenario) {
                                    updateCustomPayload(JSON.stringify(aiScenario.payload || {}, null, 2));
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
                        <VariableTextarea
                          value={customPayload}
                          onChange={(e) => updateCustomPayload(e.target.value)}
                          vars={vars}
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
                              const parsedPayload = JSON.parse(substitute(customPayload));
                              const result = await executeTest({
                                workspaceId: specId || '',
                                baseUrl: substitute(baseUrl),
                                endpoint: resolveEndpointPath(selectedEndpoint.path, pathParams, queryParams, vars),
                                method: selectedEndpoint.method,
                                payload: parsedPayload,
                                scenarioName: editingScenario ? `Edit: ${editingScenario.scenarioName}` : 'Custom Editor Run',
                                generationRule: editingScenario ? editingScenario.generationRule : 'manual',
                                expectedResult: editingScenario ? editingScenario.expectedResult : '200 OK',
                                headers: resolveHeaders({
                                  ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
                                  ...parseHeaders(substitute(customHeaders)),
                                }),
                                prerequisites: (preEndpoint && runPreEverytime) ? [
                                  {
                                    method: preMethod,
                                    endpoint: substitute(preEndpoint),
                                    payload: parsePayload(substitute(prePayload)),
                                    extractVariableKey: preExtractKey || undefined,
                                  }
                                ] : undefined,
                                geminiApiKey: geminiApiKey || undefined,
                              });
                              if (selectedEndpoint) {
                                setExecutionResultsCache((cache) => ({
                                  ...cache,
                                  [selectedEndpoint.id]: [result, ...(cache[selectedEndpoint.id] || [])]
                                }));
                              }
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

                    <Card className="p-4 col-span-1 md:col-span-2 bg-slate-50 border-slate-200 flex flex-col h-full justify-between">
                      <div className="space-y-3 flex-1 flex flex-col">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                            Swagger Schema Example
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold"
                            onClick={() => {
                              const exampleStr = generateExampleFromSchema(selectedEndpoint?.requestSchema);
                              updateCustomPayload(exampleStr);
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
      <div className="w-[420px] border-l border-border bg-card flex flex-col shrink-0 overflow-hidden">
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
                        await clearEndpointHistory(selectedEndpoint.path, selectedEndpoint.method, specId || '');
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
                   onClick={() => {
                     if (selectedEndpoint) {
                       setExecutionResultsCache((cache) => ({
                         ...cache,
                         [selectedEndpoint.id]: []
                       }));
                     }
                   }}
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
                        aiModel: h.aiModel,
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
