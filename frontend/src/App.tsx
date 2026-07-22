import { useState, useEffect } from 'react';
import { fetchActiveModel, fetchSavedSpecs, syncWorkspaceSpec, linkWorkspaceUrl, deleteWorkspace } from '@/lib/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, FileInput, Database, BarChart3, Loader2, RefreshCw, Layers, Link, Trash2 } from 'lucide-react';
import ApiTestingStudio from '@/pages/api-testing-studio';
import SpecImport from '@/pages/spec-import';
import DatasetsMappings from '@/pages/datasets-mappings';
import AiDiagnostics from '@/pages/ai-diagnostics';
import { Endpoint } from '@/types/api';
import { toast } from 'sonner';

const queryClient = new QueryClient();

function App() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceIndex, setActiveWorkspaceIndex] = useState<number>(0);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('testing');
  const [aiModel, setAiModel] = useState('qwen2.5-coder:3b');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchActiveModel()
      .then((data) => setAiModel(data.model))
      .catch(() => {});

    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const specs = await fetchSavedSpecs();
      setWorkspaces(specs || []);
      if (specs && specs.length > 0) {
        const savedId = localStorage.getItem('tester_selectedWorkspaceId');
        const matchIdx = specs.findIndex((s) => s.id === savedId);
        const idx = matchIdx >= 0 ? matchIdx : 0;
        setActiveWorkspaceIndex(idx);
        
        const activeSpec = specs[idx];
        setEndpoints(activeSpec.endpoints || []);

        const suffix = activeSpec ? `_${activeSpec.id}` : '_default';
        const savedEpId = localStorage.getItem(`tester_selectedEndpointId${suffix}`);
        if (savedEpId && activeSpec.endpoints?.some((e: any) => e.id === savedEpId)) {
          setSelectedEndpointId(savedEpId);
        } else {
          setSelectedEndpointId(activeSpec.endpoints?.[0]?.id || null);
        }
      } else {
        setEndpoints([]);
        setSelectedEndpointId(null);
      }
    } catch {
      toast.error('Failed to load workspaces.');
    }
  };

  const handleWorkspaceChange = (idx: number) => {
    setActiveWorkspaceIndex(idx);
    const selected = workspaces[idx];
    if (selected) {
      setEndpoints(selected.endpoints || []);
      localStorage.setItem('tester_selectedWorkspaceId', selected.id);

      const suffix = `_${selected.id}`;
      const savedEpId = localStorage.getItem(`tester_selectedEndpointId${suffix}`);
      if (savedEpId && selected.endpoints?.some((e: any) => e.id === savedEpId)) {
        setSelectedEndpointId(savedEpId);
      } else {
        setSelectedEndpointId(selected.endpoints?.[0]?.id || null);
      }
    }
  };

  // Sync selected endpoint ID to localStorage whenever it changes
  useEffect(() => {
    const activeSpec = workspaces[activeWorkspaceIndex];
    if (activeSpec && selectedEndpointId) {
      const suffix = `_${activeSpec.id}`;
      localStorage.setItem(`tester_selectedEndpointId${suffix}`, selectedEndpointId);
    }
  }, [selectedEndpointId, activeWorkspaceIndex, workspaces]);

  const handleSyncWorkspace = async () => {
    const activeSpec = workspaces[activeWorkspaceIndex];
    if (!activeSpec) return;
    setIsSyncing(true);
    const loadingToast = toast.loading(`Syncing latest changes for "${activeSpec.title}"...`);
    try {
      const res = await syncWorkspaceSpec(activeSpec.id);
      toast.dismiss(loadingToast);
      toast.success(res.message || 'Workspace synced successfully!');
      await loadWorkspaces();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || 'Failed to sync workspace');
    } finally {
      setIsSyncing(false);
    }
  };

  const currentWorkspace = workspaces[activeWorkspaceIndex];

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen w-full flex flex-col bg-background">
          {/* Global Header */}
          <header className="border-b border-border bg-card">
            <div className="px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 flex items-center justify-center shadow-md">
                    <Zap className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-foreground leading-tight" data-testid="text-app-title">
                      AI API Tester Studio
                    </h1>
                    <span className="text-[10px] text-slate-400 font-medium">Automated Scenario Engine</span>
                  </div>
                </div>
              </div>

              {/* Workspace Selector & Syncer */}
              <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 font-bold px-1.5 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="h-3 w-3 text-slate-400" />
                  Workspace:
                </span>
                {workspaces.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <select
                      className="text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      value={activeWorkspaceIndex}
                      onChange={(e) => handleWorkspaceChange(Number(e.target.value))}
                    >
                      {workspaces.map((w, idx) => (
                        <option key={w.id} value={idx}>
                          {w.title} ({w.endpoints?.length || 0} APIs)
                        </option>
                      ))}
                    </select>
                    {currentWorkspace && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer rounded-md"
                        onClick={async () => {
                          const conf = confirm(
                            `Are you sure you want to delete workspace "${currentWorkspace.title}"? All associated endpoints will be deleted permanently.`
                          );
                          if (!conf) return;
                          const loadingToast = toast.loading('Deleting workspace...');
                          try {
                            await deleteWorkspace(currentWorkspace.id);
                            toast.dismiss(loadingToast);
                            toast.success('Workspace deleted successfully!');
                            localStorage.removeItem('tester_selectedWorkspaceId');
                            await loadWorkspaces();
                          } catch (err: any) {
                            toast.dismiss(loadingToast);
                            toast.error(err.message || 'Failed to delete workspace');
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-amber-600 font-bold px-2">No Workspace Imported</span>
                )}

                {currentWorkspace?.swaggerUrl ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSyncing}
                    className="h-8 text-xs font-semibold bg-white hover:bg-slate-100 border-slate-200 shadow-sm flex items-center gap-1.5"
                    onClick={handleSyncWorkspace}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 text-indigo-500" />
                    )}
                    Sync Swagger URL
                  </Button>
                ) : (
                  currentWorkspace && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1"
                      onClick={async () => {
                        const url = prompt(
                          'Enter Swagger JSON URL to link this workspace (e.g. http://localhost:3000/api-json):'
                        );
                        if (!url) return;
                        const loadingToast = toast.loading('Linking Swagger URL...');
                        try {
                          await linkWorkspaceUrl(currentWorkspace.id, url);
                          toast.dismiss(loadingToast);
                          toast.success('Successfully linked Swagger URL!');
                          await loadWorkspaces();
                        } catch (err: any) {
                          toast.dismiss(loadingToast);
                          toast.error(err.message || 'Failed to link URL');
                        }
                      }}
                    >
                      <Link className="h-3.5 w-3.5 text-slate-400 mr-0.5" />
                      Link Swagger URL
                    </Button>
                  )
                )}
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-xs"
                  data-testid="badge-nestjs-status"
                >
                  <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                  NestJS :3010
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-violet-50 text-violet-700 border-violet-200 font-mono text-xs"
                  data-testid="badge-ai-model"
                >
                  {aiModel}
                </Badge>
              </div>
            </div>
          </header>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b border-slate-200 bg-white px-6 shadow-xs">
              <TabsList className="h-12 bg-transparent border-none p-0 gap-6 flex">
                <TabsTrigger
                  value="testing"
                  className="data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600 border-b-2 border-transparent h-12 px-1 rounded-none shadow-none font-semibold text-slate-500 hover:text-slate-800 transition-all flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                  data-testid="tab-testing"
                >
                  <Zap className="h-3.5 w-3.5" />
                  API Testing Studio
                </TabsTrigger>
                <TabsTrigger
                  value="import"
                  className="data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600 border-b-2 border-transparent h-12 px-1 rounded-none shadow-none font-semibold text-slate-500 hover:text-slate-800 transition-all flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                  data-testid="tab-import"
                >
                  <FileInput className="h-3.5 w-3.5" />
                  Spec Import
                </TabsTrigger>
                <TabsTrigger
                  value="datasets"
                  className="data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600 border-b-2 border-transparent h-12 px-1 rounded-none shadow-none font-semibold text-slate-500 hover:text-slate-800 transition-all flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                  data-testid="tab-datasets"
                >
                  <Database className="h-3.5 w-3.5" />
                  Datasets & Mappings
                </TabsTrigger>
                <TabsTrigger
                  value="diagnostics"
                  className="data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600 border-b-2 border-transparent h-12 px-1 rounded-none shadow-none font-semibold text-slate-500 hover:text-slate-800 transition-all flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                  data-testid="tab-diagnostics"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  AI Diagnostics
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="testing" className="flex-1 m-0 p-0">
              <ApiTestingStudio
                endpoints={endpoints}
                aiModel={aiModel}
                specId={currentWorkspace?.id}
                selectedEndpointId={selectedEndpointId}
                onSelectedEndpointIdChange={setSelectedEndpointId}
              />
            </TabsContent>

            <TabsContent value="import" className="flex-1 m-0 p-0">
              <SpecImport onEndpointsParsed={loadWorkspaces} />
            </TabsContent>

            <TabsContent value="datasets" className="flex-1 m-0 p-0">
              <DatasetsMappings />
            </TabsContent>

            <TabsContent value="diagnostics" className="flex-1 m-0 p-0">
              <AiDiagnostics />
            </TabsContent>
          </Tabs>
        </div>
        <Toaster position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
