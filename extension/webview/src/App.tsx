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
          <div className="group relative cursor-help pr-6">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <APIMorphicLogo className="h-9 w-auto shrink-0 object-contain" />
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  V1.0 PRO
                </span>
              </div>
              <div className="flex items-center gap-1.5 self-end translate-x-9 mt-0.5 mr-16">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  by
                </span>
                <RobonitoLogo className="h-4.5 w-auto text-slate-300" />
              </div>
            </div>
            
            {/* Custom CSS Hover Tooltip */}
            <div className="absolute top-12 left-0 w-80 p-3 bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 shadow-2xl z-50">
              <p className="font-bold text-indigo-450 mb-1">Why "APIMorphic"?</p>
              <p className="leading-relaxed text-[11px] text-slate-350">
                Derived from <strong>API</strong> + <strong>Morphic</strong> (shaping or varying form). Represents our local AI engine's ability to morph static API specifications into dynamic execution scenarios, realistic payloads, and boundary edge cases.
              </p>
            </div>
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

function RobonitoLogo({ className }: { className?: string }) {
  return (
    <svg
      width="3991"
      height="894"
      viewBox="0 0 3991 894"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="paint0_linear_47_943" x1="1054.53" y1="856.75" x2="1621.67" y2="376.896" gradientUnits="userSpaceOnUse">
          <stop offset="0.04" stop-color="#1B4E9B"/>
          <stop offset="1" stop-color="#0A9226"/>
        </linearGradient>
      </defs>
      <path d="M1532.3 443.376C1535.46 423.461 1538.63 403.467 1541.87 383.552C1542.9 377.26 1543.69 370.887 1545.59 364.913C1551.22 347.308 1567.85 336.077 1584.55 337.909C1603.63 340.059 1618.92 355.513 1619 374.95C1619 386.899 1616.62 398.927 1614.64 410.876C1604.11 473.567 1593.19 536.257 1582.73 599.028C1580.44 612.808 1579.41 626.828 1578.06 640.768C1565.15 772.921 1454.46 880.538 1322.78 892.805C1166.4 907.383 1026.17 792.755 1011.06 628.899C1006.93 584.052 997.671 539.682 989.912 495.153C968.375 371.046 946.363 247.099 924.589 123.071C923.717 118.053 923.084 112.955 923.163 107.937C923.4 88.978 936.545 73.365 954.519 70.2583C972.493 67.0721 990.546 77.2683 996.168 95.5896C1000.05 108.255 1001.79 121.637 1004.16 134.782C1021.5 233.079 1038.77 331.457 1056.03 429.834C1056.9 434.693 1058.16 439.393 1060.14 448.155C1121.27 369.454 1197.84 325.721 1295.55 325.721C1392.7 325.721 1469.27 368.418 1528.34 445.208C1529.69 444.65 1531.03 444.093 1532.38 443.614L1532.3 443.376ZM1293.89 627.704C1324.84 627.704 1355.8 628.262 1386.77 627.465C1419.86 626.589 1445.91 600.302 1445.99 567.483C1445.99 530.999 1418.35 504.951 1387.48 504.872C1374.81 504.872 1362.21 504.633 1349.55 504.633C1300.85 504.633 1252.24 504.633 1203.54 504.633C1189.29 504.633 1176.06 507.659 1164.58 516.98C1143.68 533.947 1135.52 560.314 1143.76 585.406C1152.08 610.817 1173.22 626.908 1200.93 627.465C1231.89 628.103 1262.84 627.624 1293.81 627.624L1293.89 627.704Z" fill="url(#paint0_linear_47_943)"/>
      <path d="M2270.58 694.776C2270.58 653.434 2268.68 612.012 2270.97 570.828C2276.67 469.344 2327.03 394.545 2412.62 343.166C2552.46 259.207 2739.4 318.392 2811.53 476.912C2826.98 510.766 2833.62 547.409 2833.94 584.609C2834.65 665.382 2834.18 746.234 2834.1 827.007C2834.1 832.663 2833.86 838.558 2832.67 844.055C2828.4 863.331 2813.2 875.042 2794.35 874.165C2776.53 873.369 2760.62 859.11 2758.08 840.868C2757.13 834.018 2757.45 826.928 2757.45 819.918C2757.45 740.977 2757.92 662.116 2757.13 583.255C2756.42 514.669 2726.02 459.864 2671.31 421.071C2548.97 334.324 2385.62 399.246 2351.1 542.072C2346.5 561.03 2346.5 561.03 2346.5 561.03C2346.5 561.03 2345.71 581.184 2345.55 600.779C2344.92 677.091 2345.16 753.484 2345.39 829.876C2345.39 844.055 2342.15 856.083 2330.91 865.483C2330.91 865.483 2330.91 865.483 2330.91 865.483C2310.17 882.928 2278.41 873.607 2271.68 847.241C2269.23 837.523 2268.91 827.087 2268.83 816.971C2268.52 776.266 2268.68 735.561 2268.68 694.776C2269.31 694.776 2269.86 694.776 2270.5 694.776H2270.58Z" fill="currentColor"/>
      <path d="M3172.04 383.951C3171.09 390.165 3169.66 395.023 3169.66 399.883C3170.3 470.539 3169.66 541.195 3172.36 611.692C3174.02 655.425 3187.4 697.085 3212.18 733.569C3223.1 749.66 3237.2 763.76 3251.14 777.461C3262.22 788.294 3276.87 793.392 3292.23 795.464C3301.65 796.738 3311.08 797.455 3320.5 798.73C3341.16 801.597 3354.23 816.015 3354.31 835.77C3354.39 856.322 3340.61 873.13 3319.47 873.528C3301.97 873.926 3283.91 871.935 3267.06 867.554C3228.02 857.517 3195.63 836.009 3169.35 805.022C3129.92 758.581 3109.49 703.698 3099.19 644.512C3096.34 628.262 3094.68 611.692 3094.6 595.204C3094.28 411.273 3094.36 227.344 3094.44 43.4136C3094.44 12.5064 3112.81 -4.14206 3140.6 0.63741C3156.75 3.42543 3166.57 13.303 3168.72 29.7125C3169.59 36.6428 3169.43 43.6526 3169.43 50.6625C3169.43 124.506 3169.43 198.348 3169.43 272.111C3169.43 276.572 3169.43 281.033 3169.43 285.494C3169.82 303.974 3170.69 305.249 3188.75 305.328C3226.68 305.568 3264.67 305.328 3302.6 305.408C3308.94 305.408 3315.27 305.249 3321.53 306.045C3340.53 308.515 3352.97 322.614 3354.07 342.449C3355.1 361.965 3343.85 376.702 3324.22 380.286C3315.59 381.88 3306.65 382.278 3297.77 382.357C3263.01 382.597 3228.18 382.357 3193.42 382.517C3186.61 382.517 3199.34 382.517 3191.51 382.995L3191.59 383.154Z" fill="currentColor"/>
      <path d="M0.0779103 671.675C0.0779103 623.96 -0.159631 576.244 0.0779103 528.529C0.869712 407.052 99.2906 307.957 220.119 306.762C238.489 306.603 256.78 306.364 275.15 306.922C282.592 307.16 290.431 308.036 297.32 310.825C313.711 317.357 322.103 332.013 320.52 348.503C318.937 364.992 307.851 377.499 290.194 380.445C278.396 382.437 266.281 382.278 254.325 382.597C243.557 382.915 232.789 382.915 222.099 382.597C146.561 380.605 76.2492 448.474 76.8035 528.291C77.4369 624.996 76.9619 721.7 76.8035 818.484C76.8035 825.494 77.041 832.584 76.0908 839.434C73.2404 860.305 56.6917 874.881 37.451 874.165C17.1808 873.368 0.632172 857.118 0.315451 835.85C-0.317991 795.782 0.0779103 755.714 -0.00126988 715.566C-0.00126988 700.909 -0.00126988 686.332 -0.00126988 671.675H0.0779103Z" fill="currentColor"/>
      <path d="M2923.66 591.698C2923.66 514.112 2923.66 436.525 2923.66 359.018C2923.66 352.645 2923.42 346.272 2924.21 339.98C2926.35 321.499 2940.43 307.24 2957.14 306.045C2976.3 304.612 2993.49 316.879 2997.84 335.917C2999.5 343.246 3000.06 351.052 3000.06 358.62C3000.21 512.519 3000.21 666.338 3000.06 820.237C3000.06 828.441 2999.58 836.885 2997.84 844.851C2994.12 862.376 2976.54 875.041 2958.57 874.244C2940.91 873.448 2925.79 858.473 2924.05 839.753C2923.5 833.46 2923.66 827.087 2923.66 820.714C2923.66 744.402 2923.66 668.09 2923.66 591.778V591.698Z" fill="currentColor"/>
      <path d="M2922.71 215.156C2924.05 207.749 2924.05 199.782 2926.9 193.012C2937.82 166.804 2969.66 161.866 2989.06 182.895C3003.55 198.587 3003.47 230.132 2988.9 245.905C2978.04 257.694 2964.75 261.836 2949.39 257.375C2935.92 253.472 2924.92 238.097 2923.73 222.883C2923.58 220.334 2923.73 217.785 2923.73 215.315C2923.34 215.315 2923.02 215.236 2922.63 215.156H2922.71Z" fill="currentColor"/>
      <path d="M1293.81 627.783C1262.84 627.783 1231.89 628.262 1200.93 627.624C1173.22 627.067 1152.08 610.976 1143.76 585.565C1135.6 560.473 1143.76 534.106 1164.58 517.139C1176.06 507.818 1189.29 504.792 1203.54 504.792C1252.24 504.792 1300.85 504.792 1349.55 504.792C1362.21 504.792 1374.81 505.031 1387.48 505.031C1418.35 505.031 1445.98 567.642 1445.98 567.642C1445.98 600.381 1419.86 626.747 1386.76 627.624C1355.8 628.421 1324.84 627.783 1293.89 627.783H1293.81ZM1222.86 602.373C1243.44 602.851 1259.91 587.795 1260.79 567.801C1261.66 547.807 1244.2 529.406 1224.2 529.168C1204.64 529.008 1188.03 545.497 1187.63 565.412C1187.22 585.963 1202.35 601.815 1222.94 602.373H1222.86ZM1361.82 602.373C1382.09 602.611 1398.32 587.158 1398.88 567.004C1399.51 546.453 1382.33 528.769 1361.98 529.007C1342.5 529.247 1325.79 546.294 1325.71 565.889C1325.71 585.963 1341.63 602.133 1361.74 602.373H1361.82Z" fill="currentColor" />
      <path d="M665.43 307.002C511.029 305.09 380.699 435.967 380.381 590.106C380.064 740.977 501.052 875.759 665.43 874.325C822.049 872.97 944.778 753.245 946.916 591.141C944.699 432.463 822.207 308.993 665.43 307.081V307.002ZM665.193 799.526C641.597 799.526 618.952 795.544 597.81 788.215C528.924 765.115 476.507 707.601 461.699 632.802C461.304 631.05 461.066 629.217 460.75 627.466C460.512 626.112 460.275 624.837 460.036 623.483C458.374 612.967 457.503 602.214 457.424 591.301C457.424 591.142 457.424 590.982 457.424 590.902C457.424 590.823 457.424 590.743 457.424 590.664C457.424 590.265 457.424 589.867 457.424 589.469C457.424 586.282 457.503 583.096 457.661 579.909C457.661 579.909 457.661 579.75 457.661 579.671C457.819 576.405 457.057 573.059 458.374 569.793C458.374 569.236 458.533 568.678 458.533 568.12C458.77 565.571 459.087 563.022 459.482 560.473C459.641 559.119 459.878 557.844 460.116 556.49C460.354 554.977 460.671 553.383 460.908 551.87C461.304 549.719 461.779 547.568 462.174 545.418C462.254 545.019 462.413 544.541 462.492 544.143C483.474 451.103 566.218 381.641 665.034 381.641C779.767 381.641 872.803 475.239 872.803 590.664C872.803 706.087 779.767 799.686 665.034 799.686L665.193 799.526Z" fill="currentColor" />
      <path d="M1919.25 307.081C1764.37 305.648 1635.63 433.1 1635.15 590.823C1634.68 749.74 1761.92 875.122 1918.69 874.326C2080.38 873.529 2200.81 747.271 2200.89 592.336C2202.55 444.97 2086.48 308.595 1919.25 307.081ZM2051.32 750.856C2024.87 773.16 1992.73 788.933 1957.49 795.782C1956.23 796.022 1955.04 796.261 1953.77 796.42C1952.03 796.739 1950.29 797.057 1948.55 797.297C1946.24 797.615 1944.03 797.934 1941.73 798.173C1940.7 798.252 1939.76 798.411 1938.81 798.491C1937.38 798.651 1935.88 798.73 1934.45 798.81C1929.07 799.208 1923.6 799.527 1918.06 799.527C1803.33 799.527 1710.3 705.928 1710.3 590.505C1710.3 475.08 1803.33 381.482 1918.06 381.482C2032.8 381.482 2125.83 475.08 2125.83 590.505C2125.83 617.508 2120.68 643.317 2111.42 667.055C2111.03 668.091 2110.63 669.047 2110.23 670.083C2109.84 671.038 2109.44 671.995 2109.05 672.95C2096.14 704.336 2075.79 730.622 2051.32 750.856Z" fill="currentColor" />
      <path d="M3706.43 307.081C3542.92 307.798 3423.91 447.916 3425.02 593.69C3426.13 740.022 3545.22 873.289 3709.59 875.042C3865.18 870.581 3992.34 754.758 3991 589.627C3989.65 422.027 3856.55 306.443 3706.43 307.081ZM3708.56 799.606C3667.95 799.606 3630.1 787.816 3598.02 767.584C3597.71 767.424 3597.39 767.185 3597.15 767.026C3594.7 765.512 3592.33 763.919 3589.95 762.246C3589.48 761.928 3589 761.609 3588.53 761.29C3586.23 759.697 3584.02 758.024 3581.8 756.272C3581.48 756.033 3581.25 755.793 3580.93 755.634C3532.15 717.399 3500.72 657.735 3500.72 590.743C3500.72 475.318 3593.75 381.721 3708.49 381.721C3823.22 381.721 3916.25 475.318 3916.25 590.743C3916.25 706.167 3823.22 799.765 3708.49 799.765L3708.56 799.606Z" fill="currentColor" />
    </svg>
  );
}

function APIMorphicLogo({ className }: { className?: string }) {
  return (
    <img
      src="logo.png"
      alt="APIMorphic Logo"
      className={className}
    />
  );
}
