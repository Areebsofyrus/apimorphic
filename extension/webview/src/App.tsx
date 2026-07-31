import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  FileCode,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Cpu,
  RefreshCw,
  Zap,
  ShieldAlert,
  Sliders,
  Send,
  Terminal,
  ChevronRight,
  Database,
  ChevronDown,
  ChevronUp,
  Copy,
  Maximize2,
} from 'lucide-react';
import {
  parseSwaggerApi,
  parsePostmanApi,
  generateScenariosApi,
  executeTestApi,
  EndpointSpec,
  ExecutionResponse,
  api,
} from './api/client';

const SAMPLE_PETSTORE_SPEC = JSON.stringify(
  {
    openapi: '3.0.0',
    info: { title: 'Petstore API', version: '1.0.0' },
    servers: [{ url: 'https://httpbin.org' }],
    paths: {
      '/post': {
        post: {
          summary: 'Create New Pet Record',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    petName: { type: 'string', example: 'Fluffy' },
                    category: { type: 'string', example: 'Dogs' },
                    age: { type: 'number', example: 3 },
                    status: { type: 'string', example: 'available' },
                  },
                },
              },
            },
          },
        },
      },
      '/get': {
        get: {
          summary: 'Fetch Pet Collection',
          responses: {
            '200': { description: 'Pet collection retrieved successfully' },
          },
        },
      },
      '/status/400': {
        post: {
          summary: 'Simulate Bad Request Error (400)',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    invalidField: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  null,
  2,
);

const SAMPLE_HEALTHCARE_SPEC = JSON.stringify(
  {
    openapi: '3.0.0',
    info: { title: 'Healthcare Portal API', version: '2.0.0' },
    servers: [{ url: 'https://httpbin.org' }],
    paths: {
      '/anything/patients': {
        post: {
          summary: 'Register New Patient',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    patientId: { type: 'string', example: 'PAT-8831' },
                    tenantId: { type: 'string', example: 'TENANT-ALPHA' },
                    fullName: { type: 'string', example: 'Sarah Connor' },
                    medicalHistory: { type: 'string', example: 'No known allergies' },
                  },
                },
              },
            },
          },
        },
      },
      '/anything/doctors': {
        get: {
          summary: 'Search Doctors Directory',
        },
      },
    },
  },
  null,
  2,
);

export default function App() {
  const [specInput, setSpecInput] = useState<string>(SAMPLE_PETSTORE_SPEC);
  const [targetBaseUrl, setTargetBaseUrl] = useState<string>('https://httpbin.org');
  const [endpoints, setEndpoints] = useState<EndpointSpec[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointSpec | null>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [activeScenarioIdx, setActiveScenarioIdx] = useState<number>(0);
  const [payloadStr, setPayloadStr] = useState<string>('{}');
  const [executionHistory, setExecutionHistory] = useState<ExecutionResponse[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState<number>(320);
  const [expandedCardIdx, setExpandedCardIdx] = useState<number | null>(null);
  const [fullscreenResponse, setFullscreenResponse] = useState<string | null>(null);
  const [fullscreenTitle, setFullscreenTitle] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'scenarios' | 'editor'>('scenarios');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  const [isLoadingSpec, setIsLoadingSpec] = useState<boolean>(false);
  const [isGeneratingScenarios, setIsGeneratingScenarios] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [aiModel, setAiModel] = useState<string>('Local AI');

  // Auto-parse default spec on mount
  useEffect(() => {
    handleParseSpec(SAMPLE_PETSTORE_SPEC);
    api.get('/runner/model')
      .then((res) => {
        if (res.data && res.data.model) {
          setAiModel(res.data.model);
        }
      })
      .catch(() => {});
  }, []);

  const handleParseSpec = async (rawContent: string) => {
    setIsLoadingSpec(true);
    try {
      const parsed = await parseSwaggerApi(rawContent);
      const fetchedEndpoints = parsed.endpoints || [];
      setEndpoints(fetchedEndpoints);
      if (parsed.baseUrl) {
        setTargetBaseUrl(parsed.baseUrl);
      }
      if (fetchedEndpoints.length > 0) {
        handleSelectEndpoint(fetchedEndpoints[0]);
      }
      setShowImportModal(false);
      setBackendConnected(true);
    } catch (err: any) {
      alert(`Spec Import Error: ${err.message || 'Failed to parse specification.'}`);
      setBackendConnected(false);
    } finally {
      setIsLoadingSpec(false);
    }
  };

  const handleSelectEndpoint = async (ep: EndpointSpec) => {
    setSelectedEndpoint(ep);
    setIsGeneratingScenarios(true);
    const schema = ep.requestSchema || { type: 'object', properties: {} };
    try {
      const generated = await generateScenariosApi(schema, ep.summary);
      setScenarios(generated || []);
      setActiveScenarioIdx(0);
      if (generated && generated.length > 0) {
        setPayloadStr(JSON.stringify(generated[0].payload || {}, null, 2));
      } else {
        setPayloadStr('{}');
      }
    } catch (err: any) {
      console.warn('Scenario generation fallback:', err);
      setScenarios([
        {
          scenarioName: 'Default Valid Payload',
          generationRule: 'valid',
          expectedResult: 'success',
          payload: { sampleKey: 'sampleValue' },
        },
      ]);
      setPayloadStr(JSON.stringify({ sampleKey: 'sampleValue' }, null, 2));
    } finally {
      setIsGeneratingScenarios(false);
    }
  };

  const handleRunSingleTest = async () => {
    if (!selectedEndpoint) return;
    setIsExecuting(true);

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(payloadStr);
    } catch {
      alert('Invalid JSON syntax in payload editor!');
      setIsExecuting(false);
      return;
    }

    const currentScenario = scenarios[activeScenarioIdx] || {};

    try {
      const res = await executeTestApi({
        baseUrl: targetBaseUrl,
        endpoint: selectedEndpoint.path.startsWith('/') ? selectedEndpoint.path : `/${selectedEndpoint.path}`,
        method: selectedEndpoint.method,
        payload: parsedPayload,
        scenarioName: currentScenario.scenarioName || 'Custom Test Execution',
        generationRule: currentScenario.generationRule || 'manual',
      });

      setExecutionHistory((prev) => [res, ...prev]);
    } catch (err: any) {
      alert(`Execution Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunAllScenarios = async () => {
    if (!selectedEndpoint || scenarios.length === 0) return;
    setIsExecuting(true);

    for (let i = 0; i < scenarios.length; i++) {
      const sc = scenarios[i];
      try {
        const res = await executeTestApi({
          baseUrl: targetBaseUrl,
          endpoint: selectedEndpoint.path.startsWith('/') ? selectedEndpoint.path : `/${selectedEndpoint.path}`,
          method: selectedEndpoint.method,
          payload: sc.payload || {},
          scenarioName: sc.scenarioName,
          generationRule: sc.generationRule,
        });
        setExecutionHistory((prev) => [res, ...prev]);
      } catch (err: any) {
        console.error('Scenario run error:', err);
      }
    }
    setIsExecuting(false);
  };

  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesSearch =
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ep.summary && ep.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesMethod = methodFilter === 'ALL' || ep.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-white tracking-tight">AI API Tester Studio</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                V1.0 PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Automated Scenario Engine & Local AI Diagnostics</p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSpecInput(SAMPLE_PETSTORE_SPEC);
              handleParseSpec(SAMPLE_PETSTORE_SPEC);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:border-indigo-500/50 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" /> Petstore API
          </button>
          <button
            onClick={() => {
              setSpecInput(SAMPLE_HEALTHCARE_SPEC);
              handleParseSpec(SAMPLE_HEALTHCARE_SPEC);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:border-indigo-500/50 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Database className="h-3.5 w-3.5 text-emerald-400" /> Healthcare API
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <FileCode className="h-3.5 w-3.5" /> Custom Spec Import
          </button>
        </div>

        {/* System Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${
              backendConnected
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            NestJS Engine (:3000)
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium">
            <Cpu className="h-3.5 w-3.5 text-purple-400" />
            {aiModel}
          </div>
        </div>
      </header>

      {/* Studio Workspace 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: API Explorer Sidebar */}
        <aside style={{ width: sidebarWidth }} className="border-r border-slate-800/80 bg-slate-950/60 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800/80 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Method Filter Pills */}
            <div className="flex gap-1">
              {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                    methodFilter === m
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredEndpoints.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No matching endpoints found.
              </div>
            ) : (
              filteredEndpoints.map((ep) => {
                const isSelected = selectedEndpoint?.id === ep.id;
                return (
                  <div
                    key={ep.id}
                    onClick={() => handleSelectEndpoint(ep)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'glass-card-active border-indigo-500/60 shadow-lg glow-indigo'
                        : 'glass-card border-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider ${
                          ep.method === 'GET'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : ep.method === 'POST'
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : ep.method === 'PUT'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {ep.method}
                      </span>
                      <ChevronRight className={`h-3.5 w-3.5 text-slate-600 ${isSelected ? 'text-indigo-400' : ''}`} />
                    </div>
                    <div className="font-mono text-xs font-semibold text-slate-200 truncate">{ep.path}</div>
                    {ep.summary && <p className="text-[11px] text-slate-400 truncate mt-0.5">{ep.summary}</p>}
                  </div>
                );
              })
            )}
          </div>
        </aside>
        {/* Resizable drag handle */}
        <div
          className="w-1 cursor-col-resize hover:bg-indigo-500 bg-slate-800 transition-colors duration-150 shrink-0 select-none"
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

        {/* Column 2: Request Studio & Scenario Engine */}
        <main className="flex-1 flex flex-col border-r border-slate-800/80 overflow-y-auto">
          {selectedEndpoint ? (
            <div className="p-6 space-y-6 flex-1 flex flex-col">
              {/* Target Configuration Header */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      selectedEndpoint.method === 'GET'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : selectedEndpoint.method === 'POST'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {selectedEndpoint.method}
                  </span>
                  <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 font-mono text-xs">
                    <span className="text-slate-500 mr-1">Host Base URL:</span>
                    <input
                      type="text"
                      value={targetBaseUrl}
                      onChange={(e) => setTargetBaseUrl(e.target.value)}
                      className="bg-transparent text-indigo-300 font-semibold focus:outline-none flex-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h2 className="font-mono text-base font-bold text-white">{selectedEndpoint.path}</h2>
                    <p className="text-xs text-slate-400">{selectedEndpoint.summary || 'No endpoint summary provided.'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRunAllScenarios}
                      disabled={isExecuting || scenarios.length === 0}
                      className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Zap className="h-3.5 w-3.5 text-indigo-400" /> Run All Scenarios ({scenarios.length})
                    </button>
                    <button
                      onClick={handleRunSingleTest}
                      disabled={isExecuting}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" /> {isExecuting ? 'Executing...' : 'Execute Selected'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs for Studio */}
              <div className="flex-1 flex flex-col space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <button
                    onClick={() => setActiveTab('scenarios')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                      activeTab === 'scenarios'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                    }`}
                  >
                    <Sliders className="h-3.5 w-3.5" /> Scenario Suite ({scenarios.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                      activeTab === 'editor'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                    }`}
                  >
                    <Terminal className="h-3.5 w-3.5" /> Payload JSON Editor
                  </button>
                </div>

                {/* Scenario Suite Grid */}
                {activeTab === 'scenarios' && (
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {isGeneratingScenarios ? (
                      <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" /> Generating Hybrid Scenarios & Local AI Payloads...
                      </div>
                    ) : (
                      scenarios.map((sc, idx) => {
                        const isSelectedScenario = activeScenarioIdx === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setActiveScenarioIdx(idx);
                              setPayloadStr(JSON.stringify(sc.payload || {}, null, 2));
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                              isSelectedScenario
                                ? 'glass-card-active border-indigo-500/80 shadow-md'
                                : 'glass-card border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">{sc.scenarioName}</span>
                                {sc.generationRule === 'sql_injection' || sc.generationRule === 'xss' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                    <ShieldAlert className="h-3 w-3" /> Security
                                  </span>
                                ) : sc.generationRule === 'ai_enriched' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                    <Cpu className="h-3 w-3" /> Local AI Enriched
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                    Rule: {sc.generationRule}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Expected: <strong className="text-slate-200">{sc.expectedResult}</strong>
                              </span>
                            </div>

                            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] font-mono text-emerald-400 max-h-24 overflow-y-auto">
                              {JSON.stringify(sc.payload || {}, null, 2)}
                            </pre>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Raw JSON Payload Editor */}
                {activeTab === 'editor' && (
                  <div className="flex-1 flex flex-col space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Request Payload (JSON)</span>
                      <span className="text-slate-500 font-normal">Edit values directly before execution</span>
                    </label>
                    <textarea
                      value={payloadStr}
                      onChange={(e) => setPayloadStr(e.target.value)}
                      rows={14}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-emerald-400 focus:outline-none focus:border-indigo-500 shadow-inner"
                    ></textarea>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Layers className="h-12 w-12 mb-3 text-slate-700" />
              <h3 className="text-base font-semibold text-slate-300">No Endpoint Selected</h3>
              <p className="text-xs max-w-sm mt-1">Select an endpoint from the left sidebar to generate test scenarios and inspect payloads.</p>
            </div>
          )}
        </main>

        {/* Column 3: Test Console & Local AI Diagnostics */}
        <aside className="w-[420px] bg-slate-950/80 p-5 flex flex-col border-l border-slate-800/80 overflow-y-auto space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <Terminal className="h-4 w-4 text-indigo-400" /> Test Execution Console
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
              {executionHistory.length} Runs
            </span>
          </div>

          {/* Metrics Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card p-3 rounded-xl text-center border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Passed</span>
              <div className="text-lg font-extrabold text-emerald-400">
                {executionHistory.filter((r) => r.passed).length}
              </div>
            </div>
            <div className="glass-card p-3 rounded-xl text-center border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Failed</span>
              <div className="text-lg font-extrabold text-rose-400">
                {executionHistory.filter((r) => !r.passed).length}
              </div>
            </div>
            <div className="glass-card p-3 rounded-xl text-center border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Avg Latency</span>
              <div className="text-lg font-extrabold text-indigo-400">
                {executionHistory.length > 0
                  ? Math.round(
                      executionHistory.reduce((acc, curr) => acc + curr.responseTimeMs, 0) /
                        executionHistory.length,
                    )
                  : 0}
                <span className="text-[10px] ml-0.5 font-normal">ms</span>
              </div>
            </div>
          </div>

          {/* Execution Logs */}
          <div className="flex-1 space-y-4">
            {executionHistory.length === 0 ? (
              <div className="text-center py-16 text-slate-600 text-xs">
                No tests executed yet. Click <strong>Execute Selected</strong> or <strong>Run All Scenarios</strong> to test endpoints.
              </div>
            ) : (
              executionHistory.map((res, idx) => (
                <div
                  key={idx}
                  className={`glass-panel p-4 rounded-2xl border transition-all ${
                    res.passed ? 'border-emerald-500/40 glow-emerald' : 'border-rose-500/40 glow-rose'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {res.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      )}
                      <span className="font-bold text-xs text-white">{res.scenarioName}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        res.statusCode >= 200 && res.statusCode < 300
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {res.statusCode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-3">
                    <span>Rule: {res.generationRule}</span>
                    <span className="flex items-center gap-1 text-indigo-400">
                      <Clock className="h-3 w-3" /> {res.responseTimeMs} ms
                    </span>
                  </div>

                  {/* Local AI Failure Diagnostic Card */}
                  {res.aiExplanation && (
                    <div className="bg-purple-950/40 border border-purple-500/40 p-3 rounded-xl space-y-1.5 mb-3">
                      <div className="flex items-center gap-1.5 text-purple-300 text-[11px] font-bold">
                        <Cpu className="h-3.5 w-3.5 text-purple-400" /> Local AI Failure Analysis ({res.aiModel || 'Local AI'}):
                      </div>
                      <p className="text-xs text-purple-200 leading-relaxed">{res.aiExplanation}</p>
                    </div>
                  )}

                  {/* Details Toggle Button */}
                  <button
                    onClick={() => setExpandedCardIdx(expandedCardIdx === idx ? null : idx)}
                    className="w-full text-center py-1 mt-2 hover:bg-slate-900/60 border-t border-slate-800/80 text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1 transition-all rounded-b-xl cursor-pointer"
                  >
                    {expandedCardIdx === idx ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5 text-indigo-400" /> Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5 text-indigo-400" /> Show Details
                      </>
                    )}
                  </button>

                  {expandedCardIdx === idx && (
                    <div className="space-y-3 pt-3 border-t border-slate-800/80 mt-2 text-left">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-slate-400">Request Payload</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(res.requestPayload || {}, null, 2));
                              alert('Request payload copied!');
                            }}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-900/60 text-[10px] font-mono text-emerald-400 max-h-36 overflow-y-auto whitespace-pre-wrap break-all">
                          {JSON.stringify(res.requestPayload || {}, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-slate-400">Response Body</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(res.responseBody || {}, null, 2));
                                alert('Response body copied!');
                              }}
                              className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => {
                                setFullscreenTitle(res.scenarioName);
                                setFullscreenResponse(JSON.stringify(res.responseBody || {}, null, 2));
                              }}
                              className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                            >
                              Expand
                            </button>
                          </div>
                        </div>
                        <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-900/60 text-[10px] font-mono text-emerald-400 max-h-36 overflow-y-auto whitespace-pre-wrap break-all">
                          {JSON.stringify(res.responseBody || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Custom Spec Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="glass-panel max-w-2xl w-full p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCode className="h-5 w-5 text-indigo-400" /> Import OpenAPI / Swagger Specification
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Paste raw JSON/YAML content or enter a live Swagger URL (e.g. <code>https://petstore.swagger.io/v2/swagger.json</code> or <code>http://localhost:8080/v3/api-docs</code>):
            </p>
            <textarea
              value={specInput}
              onChange={(e) => setSpecInput(e.target.value)}
              rows={12}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
            ></textarea>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleParseSpec(specInput)}
                disabled={isLoadingSpec}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" /> {isLoadingSpec ? 'Parsing Spec...' : 'Parse & Discover APIs'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Fullscreen Response Modal */}
      {fullscreenResponse && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="glass-panel max-w-4xl w-full p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Response Body for: {fullscreenTitle}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(fullscreenResponse);
                    alert('Copied response JSON!');
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                >
                  Copy JSON
                </button>
                <button
                  onClick={() => setFullscreenResponse(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-auto font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed">
              {fullscreenResponse}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
