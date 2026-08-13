import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Layers, 
  PlayCircle, 
  Search, 
  Shield, 
  ShieldAlert, 
  Trash2, 
  RefreshCw, 
  Database,
  Calendar
} from 'lucide-react';
import { 
  fetchAdminStats, 
  fetchAdminUsers, 
  updateUserRole, 
  deleteUser, 
  fetchAdminWorkspaces, 
  deleteAdminWorkspace 
} from '@/lib/api-client';
import { toast } from 'sonner';

interface AdminStats {
  totalUsers: number;
  totalWorkspaces: number;
  totalLogs: number;
  totalScenarios: number;
}

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  geminiApiKey: string | null;
  createdAt: string;
  workspacesCount: number;
  datasetsCount: number;
  mappingsCount: number;
  workspaces?: Array<{
    id: string;
    title: string;
    version: string;
    sourceType: 'swagger' | 'openapi' | 'postman';
    baseUrl?: string;
    endpointsCount: number;
    logsCount: number;
  }>;
}

interface AdminWorkspace {
  id: string;
  title: string;
  version: string;
  sourceType: 'swagger' | 'openapi' | 'postman';
  baseUrl?: string;
  createdAt: string;
  endpointsCount: number;
  creator: {
    id: string;
    email: string;
    name?: string;
  } | null;
}

export default function SuperAdmin() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [searchWorkspace, setSearchWorkspace] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u, w] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminWorkspaces(),
      ]);
      setStats(s);
      setUsers(u);
      setWorkspaces(w);
      if (selectedUser) {
        const updated = u.find((usr: AdminUser) => usr.id === selectedUser.id);
        setSelectedUser(updated || null);
      }
    } catch {
      toast.error('Failed to load administration data. Make sure you are authorized.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const targetRole = currentRole === 'superadmin' ? 'user' : 'superadmin';
    const conf = confirm(`Are you sure you want to change this user's role to "${targetRole}"?`);
    if (!conf) return;

    try {
      await updateUserRole(userId, targetRole);
      toast.success(`Role updated successfully to ${targetRole}!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user role');
    }
  };

  const handleUserDelete = async (userId: string, email: string) => {
    const conf = confirm(`CRITICAL WARNING: This will permanently delete user "${email}" and all associated workspaces, datasets, and execution logs. Are you absolutely sure?`);
    if (!conf) return;

    try {
      await deleteUser(userId);
      toast.success('User deleted successfully');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const handleWorkspaceDelete = async (specId: string, title: string) => {
    const conf = confirm(`Are you sure you want to delete workspace spec "${title}"? This cannot be undone.`);
    if (!conf) return;

    try {
      await deleteAdminWorkspace(specId);
      toast.success('Workspace spec deleted successfully');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete workspace');
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = searchUser.toLowerCase();
    return (
      u.email.toLowerCase().includes(query) ||
      (u.name && u.name.toLowerCase().includes(query))
    );
  });

  const filteredWorkspaces = workspaces.filter((w) => {
    const query = searchWorkspace.toLowerCase();
    return (
      w.title.toLowerCase().includes(query) ||
      (w.creator && w.creator.email.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background text-foreground p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-indigo-500 animate-pulse" /> Super Admin Panel
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            APIMorphic platform management, user controls, and system activity metrics.
          </p>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          disabled={loading}
          onClick={loadData}
          className="h-9 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border flex items-center gap-1.5 cursor-pointer font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Control
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <Card className="p-4 bg-card border border-border flex items-center gap-4 hover:border-primary/30 transition-colors shadow-xs">
          <div className="p-3 bg-indigo-550/10 rounded-lg text-indigo-500">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Registered Users</p>
            <h3 className="text-2xl font-bold text-foreground mt-0.5">{stats?.totalUsers ?? '0'}</h3>
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border flex items-center gap-4 hover:border-primary/30 transition-colors shadow-xs">
          <div className="p-3 bg-purple-550/10 rounded-lg text-purple-500">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total Workspaces</p>
            <h3 className="text-2xl font-bold text-foreground mt-0.5">{stats?.totalWorkspaces ?? '0'}</h3>
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border flex items-center gap-4 hover:border-primary/30 transition-colors shadow-xs">
          <div className="p-3 bg-pink-550/10 rounded-lg text-pink-505 text-pink-500">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Saved Test Cases</p>
            <h3 className="text-2xl font-bold text-foreground mt-0.5">{stats?.totalScenarios ?? '0'}</h3>
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border flex items-center gap-4 hover:border-primary/30 transition-colors shadow-xs">
          <div className="p-3 bg-emerald-550/10 rounded-lg text-emerald-500">
            <PlayCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Execution Logs</p>
            <h3 className="text-2xl font-bold text-foreground mt-0.5">{stats?.totalLogs ?? '0'}</h3>
          </div>
        </Card>
      </div>

      {/* Main Content Area */}
      <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center shrink-0 border-b border-border pb-2">
          <TabsList className="bg-muted border border-border">
            <TabsTrigger value="users" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer flex items-center gap-1.5 py-1.5 font-semibold text-muted-foreground hover:text-foreground">
              <Users className="h-3.5 w-3.5" /> User Accounts
            </TabsTrigger>
            <TabsTrigger value="workspaces" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer flex items-center gap-1.5 py-1.5 font-semibold text-muted-foreground hover:text-foreground">
              <Layers className="h-3.5 w-3.5" /> Specs & Workspaces
            </TabsTrigger>
          </TabsList>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={activeTab === 'users' ? 'Search user...' : 'Search workspace...'}
              value={activeTab === 'users' ? searchUser : searchWorkspace}
              onChange={(e) => activeTab === 'users' ? setSearchUser(e.target.value) : setSearchWorkspace(e.target.value)}
              className="pl-8 text-xs bg-background border-border focus:border-primary text-foreground h-9"
            />
          </div>
        </div>

        {/* Tab 1: User Management */}
        <TabsContent value="users" className="flex-1 min-h-0 mt-4 outline-none">
          <Card className="bg-card border border-border h-full flex flex-col min-h-0 overflow-hidden shadow-xs">
            <ScrollArea className="flex-1">
              <div className="min-w-[800px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px] bg-muted/30">
                      <th className="p-4">User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Datasets</th>
                      <th className="p-4">Mappings</th>
                      <th className="p-4">Specs Created</th>
                      <th className="p-4">Joined Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/45">
                    {filteredUsers.map((u) => (
                      <tr 
                        key={u.id} 
                        className="hover:bg-muted/20 transition-colors text-foreground cursor-pointer"
                        onClick={() => setSelectedUser(u)}
                        title="Click row to view workspaces details"
                      >
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{u.name || 'Anonymous User'}</span>
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{u.email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {u.role === 'superadmin' ? (
                            <Badge className="bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 text-[10px] font-bold py-0.5 px-2">
                              Super Admin
                            </Badge>
                          ) : (
                            <Badge className="bg-secondary text-secondary-foreground border border-border text-[10px] font-bold py-0.5 px-2">
                              Standard User
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">{u.datasetsCount}</td>
                        <td className="p-4 font-mono font-semibold text-purple-500 dark:text-purple-400">{u.mappingsCount}</td>
                        <td className="p-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {u.workspacesCount}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(u.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRoleChange(u.id, u.role);
                              }}
                              className="h-8 text-[11px] bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border flex items-center gap-1 cursor-pointer font-medium"
                            >
                              <Shield className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                              Toggle Role
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUserDelete(u.id, u.email);
                              }}
                              className="h-8 text-[11px] bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 flex items-center gap-1 cursor-pointer font-medium"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-muted-foreground font-semibold">
                          No users found matching query
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Tab 2: Spec & Workspace Management */}
        <TabsContent value="workspaces" className="flex-1 min-h-0 mt-4 outline-none">
          <Card className="bg-card border border-border h-full flex flex-col min-h-0 overflow-hidden shadow-xs">
            <ScrollArea className="flex-1">
              <div className="min-w-[800px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px] bg-muted/30">
                      <th className="p-4">Workspace / Spec Title</th>
                      <th className="p-4">Source Type</th>
                      <th className="p-4">Endpoints</th>
                      <th className="p-4">Creator / Owner</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/45">
                    {filteredWorkspaces.map((w) => (
                      <tr key={w.id} className="hover:bg-muted/20 transition-colors text-foreground">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{w.title}</span>
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{w.baseUrl || 'No base URL linked'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className="bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold py-0.5 px-2 capitalize">
                            {w.sourceType}
                          </Badge>
                        </td>
                        <td className="p-4 font-mono font-semibold text-purple-500 dark:text-purple-400">{w.endpointsCount}</td>
                        <td className="p-4">
                          {w.creator ? (
                            <div className="flex flex-col">
                              <span className="text-foreground">{w.creator.name || 'Anonymous'}</span>
                              <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{w.creator.email}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">No Owner</span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(w.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWorkspaceDelete(w.id, w.title)}
                            className="h-8 text-[11px] bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete Spec
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredWorkspaces.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-muted-foreground font-semibold">
                          No workspace specs found matching query
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workspaces Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <Card className="w-full max-w-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/40 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="h-4.5 w-4.5 text-primary" />
                  Workspaces of {selectedUser.email}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Manage the individual API specifications imported by this user.
                </p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-muted-foreground hover:text-foreground text-lg cursor-pointer focus:outline-none p-1"
              >
                ✕
              </button>
            </div>

            <ScrollArea className="flex-1 p-4 bg-card">
              <div className="space-y-3">
                {selectedUser.workspaces && selectedUser.workspaces.length > 0 ? (
                  selectedUser.workspaces.map((w) => (
                    <div 
                      key={w.id} 
                      className="p-4 bg-background border border-border rounded-xl flex items-center justify-between gap-4 hover:border-primary/45 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{w.title}</span>
                          <Badge className="bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold py-0.5 px-2 capitalize">
                            {w.sourceType}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">{w.baseUrl || 'No base URL linked'}</p>
                        <div className="flex items-center gap-3 text-[11px] font-semibold mt-1">
                          <span className="text-indigo-600 dark:text-indigo-400">{w.endpointsCount} Endpoints</span>
                          <span className="text-border">•</span>
                          <span className="text-amber-600 dark:text-amber-500">{w.logsCount || 0} Execution Logs</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWorkspaceDelete(w.id, w.title)}
                        className="h-8 text-[11px] bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete Spec
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-8 text-muted-foreground italic text-xs">
                    This user has not created any workspaces yet.
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border bg-muted/30 flex justify-end shrink-0">
              <Button 
                size="sm"
                onClick={() => setSelectedUser(null)}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border h-9 text-xs font-semibold cursor-pointer"
              >
                Close View
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
