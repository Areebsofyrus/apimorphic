import { useState, useEffect } from 'react';
import { fetchActiveModel, fetchSavedSpecs, syncWorkspaceSpec, linkWorkspaceUrl, deleteWorkspace, fetchMe, saveKeys, saveWorkspaceProfiles, saveWorkspaceConfig } from '@/lib/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import RobonitoLogo from '@/components/robonito-logo';
import APIMorphicLogo from '@/components/apimorphic-logo';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, FileInput, Database, BarChart3, Loader2, RefreshCw, Layers, Link, Trash2, Eye, EyeOff, LogOut, Settings, MoreVertical, ChevronDown, User, LayoutDashboard } from 'lucide-react';
import ApiTestingStudio from '@/pages/api-testing-studio';
import SpecImport from '@/pages/spec-import';
import DatasetsMappings from '@/pages/datasets-mappings';
import AiDiagnostics from '@/pages/ai-diagnostics';
import Login from '@/pages/login';
import ProfilesSheet from '@/components/profiles-sheet';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Endpoint } from '@/types/api';
import { toast } from 'sonner';

const queryClient = new QueryClient();

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tester_jwt_token'));
  const [user, setUser] = useState<{ id: string; email: string; name?: string; geminiApiKey?: string } | null>(null);
  const [showProfilesModal, setShowProfilesModal] = useState(false);

  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceIndex, setActiveWorkspaceIndex] = useState<number>(0);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('testing');
  const [aiModel, setAiModel] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  
  interface Profile {
    name: string;
    variables: Record<string, string>;
  }

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileName, setActiveProfileName] = useState<string>('');
  const [globalVariables, setGlobalVariables] = useState<Record<string, string>>({});

  const currentWorkspace = workspaces[activeWorkspaceIndex];

  // Handle Token Changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('tester_jwt_token', token);
      fetchMe()
        .then((profile) => {
          setUser(profile);
          setGeminiApiKey(profile.geminiApiKey || '');
          loadWorkspaces();
        })
        .catch(() => {
          handleLogout();
        });
    } else {
      localStorage.removeItem('tester_jwt_token');
      setUser(null);
    }
  }, [token]);

  // Sync Profiles when workspace changes
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    
    setGlobalVariables(currentWorkspace.globalVariables || {});

    if (currentWorkspace.profiles && currentWorkspace.profiles.length > 0) {
      setProfiles(currentWorkspace.profiles);
      setActiveProfileName(currentWorkspace.activeProfileName || '');
    } else {
      const initial: Profile[] = [
        { name: 'Super Admin', variables: { username: 'superadmin', password: 'password', tenantId: 'ALPHA' } },
        { name: 'Tenant Admin', variables: { username: 'tenantadmin', password: 'password', tenantId: 'BETA' } },
      ];
      setProfiles(initial);
      setActiveProfileName('');
      saveWorkspaceProfiles(currentWorkspace.id, initial, '', {}).catch(() => {});
    }
  }, [currentWorkspace?.id]);

  // Save Gemini Key to backend when edited
  useEffect(() => {
    if (!token || !user) return;
    fetchActiveModel(geminiApiKey.trim())
      .then((data) => setAiModel(data.model))
      .catch(() => {});

    // Only save key to database if it is different from the currently loaded user profile key
    // to avoid overwriting it during load/mount!
    if (geminiApiKey !== (user.geminiApiKey || '')) {
      saveKeys(geminiApiKey).catch(() => {});
    }
  }, [geminiApiKey, token, user]);

  const loadWorkspaces = async () => {
    try {
      const specs = await fetchSavedSpecs();
      setWorkspaces(specs || []);
      if (specs && specs.length > 0) {
        const savedId = localStorage.getItem('tester_selectedWorkspaceId');
        const matchIdx = specs.findIndex((s: any) => s.id === savedId);
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

  const handleLogout = () => {
    localStorage.removeItem('tester_jwt_token');
    setToken(null);
    setUser(null);
    setWorkspaces([]);
    setEndpoints([]);
    setSelectedEndpointId(null);
  };

  if (!token) {
    return (
      <TooltipProvider>
        <Login onLoginSuccess={(t) => setToken(t)} />
        <Toaster position="top-right" />
      </TooltipProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen w-full flex flex-col bg-background">
          {/* Global Header */}
          <header className="border-b border-border bg-card">
            <div className="px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
              {/* Left Side: Brand & Workspace Selector */}
              <div className="flex items-center gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center relative cursor-help select-none pr-5">
                      <APIMorphicLogo className="h-9 w-auto shrink-0 object-contain" />
                      <div className="flex items-center gap-1.5 self-end translate-x-9 mt-0.5 mr-2">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          by
                        </span>
                        <RobonitoLogo className="h-4.5 w-auto text-indigo-650 dark:text-indigo-400" />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="max-w-xs p-3 space-y-1.5 bg-slate-900 text-slate-100 border border-slate-800 shadow-xl rounded-xl">
                    <p className="font-bold text-indigo-400 text-xs">Why "APIMorphic"?</p>
                    <p className="text-[11px] leading-relaxed text-slate-350">
                      Derived from <strong>API</strong> + <strong>Morphic</strong> (shaping/varying form). Represents our AI engine's ability to morph static API specifications into dynamic execution scenarios, realistic payloads, and boundary edge cases.
                    </p>
                  </TooltipContent>
                </Tooltip>

                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

                {/* Workspace Selector */}
                <div className="flex items-center gap-1.5">
                  {workspaces.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <select
                        className="text-xs font-bold bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 border-none rounded-md px-2 py-1.5 focus:outline-none cursor-pointer text-slate-700 dark:text-slate-200"
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-52 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-md">
                            {currentWorkspace.swaggerUrl ? (
                              <DropdownMenuItem
                                disabled={isSyncing}
                                onClick={handleSyncWorkspace}
                                className="text-xs flex items-center gap-2 cursor-pointer"
                              >
                                <RefreshCw className={`h-3.5 w-3.5 text-indigo-500 ${isSyncing ? 'animate-spin' : ''}`} />
                                <span>Sync Swagger URL</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
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
                                className="text-xs flex items-center gap-2 cursor-pointer"
                              >
                                <Link className="h-3.5 w-3.5 text-slate-450" />
                                <span>Link Swagger URL</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
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
                              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete Workspace</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 font-bold px-2">No Workspace Imported</span>
                  )}
                </div>
              </div>

              {/* Right Side: Profile Switcher & Popover Settings */}
              <div className="flex items-center gap-4">
                {/* Profile Selector */}
                {currentWorkspace && (
                  <div className="flex items-center gap-1 animate-in fade-in duration-200">
                    <Database className="h-3.5 w-3.5 text-slate-400" />
                    <select
                      className="text-xs font-semibold bg-transparent border-none focus:outline-none cursor-pointer text-slate-650 dark:text-slate-350 pr-1 hover:text-slate-800"
                      value={activeProfileName}
                      onChange={async (e) => {
                        const name = e.target.value;
                        setActiveProfileName(name);
                        if (currentWorkspace?.id) {
                          try {
                            await saveWorkspaceProfiles(currentWorkspace.id, profiles, name, globalVariables);
                            setWorkspaces(prev => prev.map(w => w.id === currentWorkspace.id ? { ...w, activeProfileName: name } : w));
                          } catch {
                            toast.error('Failed to sync active profile to database');
                          }
                        }
                      }}
                    >
                      <option value="">No Profile (Raw Values)</option>
                      {profiles.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer rounded-md flex items-center justify-center shrink-0"
                      onClick={() => setShowProfilesModal(true)}
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-400 hover:text-slate-650" />
                    </Button>
                  </div>
                )}

                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

                {/* System Settings Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 px-3 flex items-center gap-1.5 border-slate-200 hover:bg-slate-50 dark:border-slate-850 cursor-pointer rounded-lg text-xs font-semibold"
                    >
                      <User className="h-4 w-4 text-indigo-500" />
                      <span className="text-slate-650 max-w-[120px] truncate">{user?.name || user?.email.split('@')[0]}</span>
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-4 space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-950">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Account Settings
                      </h4>
                      {user?.name && (
                        <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 py-0.5">
                          <User className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Name: <strong className="text-slate-900 dark:text-slate-100">{user.name}</strong></span>
                        </div>
                      )}
                      <p className="text-xs text-slate-700 dark:text-slate-350 truncate">
                        Logged in as: <strong className="text-slate-900 dark:text-slate-100">{user?.email}</strong>
                      </p>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-900 pt-3 space-y-2.5">
                      <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Gemini AI Settings
                      </h4>
                      <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 h-9">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-2 select-none">
                          Key:
                        </span>
                        <input
                          type={showGeminiKey ? "text" : "password"}
                          placeholder="AIzaSy... (Cloud)"
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          className="w-full bg-transparent text-[11px] font-mono focus:outline-none pr-6 text-slate-700 dark:text-slate-200"
                        />
                        {geminiApiKey && (
                          <button
                            type="button"
                            className="absolute right-2 text-slate-400 hover:text-slate-650 focus:outline-none cursor-pointer"
                            onClick={() => setShowGeminiKey(!showGeminiKey)}
                          >
                            {showGeminiKey ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {aiModel && aiModel !== 'offline' && (
                      <div className="border-t border-slate-100 dark:border-slate-900 pt-3 space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                          Active AI Model
                        </h4>
                        <div className="flex items-center gap-1.5 py-0.5">
                          <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                          <Badge
                            variant="outline"
                            className="bg-violet-50 text-violet-750 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900 font-mono text-[10px] px-1.5 py-0.5"
                          >
                            {aiModel}
                          </Badge>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-900 pt-3 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8.5 text-xs text-rose-600 hover:text-rose-750 hover:bg-rose-50 border border-rose-250 cursor-pointer rounded-lg flex items-center justify-center gap-1.5 font-semibold"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Log out of Account
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
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
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
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
                geminiApiKey={geminiApiKey}
                profiles={profiles}
                activeProfileName={activeProfileName}
                globalVariables={globalVariables}
                onProfilesChange={async (updated) => {
                  setProfiles(updated);
                  if (currentWorkspace?.id) {
                    try {
                      await saveWorkspaceProfiles(currentWorkspace.id, updated, activeProfileName, globalVariables);
                      setWorkspaces(prev => prev.map(w => w.id === currentWorkspace.id ? { ...w, profiles: updated } : w));
                    } catch {
                      toast.error('Failed to sync profiles to database');
                    }
                  }
                }}
                workspaceConfig={currentWorkspace ? {
                  baseUrl: currentWorkspace.baseUrl,
                  authToken: currentWorkspace.authToken,
                  customHeaders: currentWorkspace.customHeaders,
                  preMethod: currentWorkspace.preMethod,
                  preEndpoint: currentWorkspace.preEndpoint,
                  prePayload: currentWorkspace.prePayload,
                  preExtractKey: currentWorkspace.preExtractKey,
                  runPreEverytime: currentWorkspace.runPreEverytime,
                  showSettings: currentWorkspace.showSettings,
                } : undefined}
                onWorkspaceConfigChange={async (updatedConfig) => {
                  if (currentWorkspace?.id) {
                    try {
                      await saveWorkspaceConfig(currentWorkspace.id, updatedConfig);
                      setWorkspaces(prev => prev.map(w => w.id === currentWorkspace.id ? { ...w, ...updatedConfig } : w));
                    } catch {
                      toast.error('Failed to sync environment config to database');
                    }
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="import" className="flex-1 m-0 p-0">
              <SpecImport onEndpointsParsed={loadWorkspaces} />
            </TabsContent>

            <TabsContent value="datasets" className="flex-1 m-0 p-0">
              <DatasetsMappings />
            </TabsContent>

            <TabsContent value="diagnostics" className="flex-1 m-0 p-0">
              <AiDiagnostics endpoints={endpoints} />
            </TabsContent>
          </Tabs>
        </div>
        <ProfilesSheet
          isOpen={showProfilesModal}
          onClose={() => setShowProfilesModal(false)}
          profiles={profiles}
          globalVariables={globalVariables}
          onSave={async (updatedProfiles, updatedGlobals) => {
            setProfiles(updatedProfiles);
            setGlobalVariables(updatedGlobals);
            if (currentWorkspace?.id) {
              try {
                await saveWorkspaceProfiles(currentWorkspace.id, updatedProfiles, activeProfileName, updatedGlobals);
                setWorkspaces(prev => prev.map(w => w.id === currentWorkspace.id ? { ...w, profiles: updatedProfiles, globalVariables: updatedGlobals } : w));
              } catch {
                toast.error('Failed to sync settings to database');
              }
            }
          }}
        />
        <Toaster position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
