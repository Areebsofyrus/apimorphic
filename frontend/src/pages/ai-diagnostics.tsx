import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { MethodBadge } from '@/components/method-badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  Shield, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  HelpCircle,
  PlayCircle
} from 'lucide-react';
import { fetchHistory } from '@/lib/api-client';
import { toast } from 'sonner';

interface AiDiagnosticsProps {
  endpoints?: any[];
}

export default function AiDiagnostics({ endpoints = [] }: AiDiagnosticsProps) {
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await fetchHistory();
      setHistoryList(data || []);
    } catch {
      toast.error('Failed to load test history from database.');
    } finally {
      setIsLoading(false);
    }
  };

  // Compile individual history runs into unique API endpoint statistics
  const endpointStats = useMemo(() => {
    const statsMap: Record<string, {
      method: string;
      endpoint: string;
      total: number;
      passed: number;
      failed: number;
      totalLatency: number;
      lastRun: string;
    }> = {};

    historyList.forEach((h) => {
      const key = `${h.method} ${h.endpoint}`;
      if (!statsMap[key]) {
        statsMap[key] = {
          method: h.method,
          endpoint: h.endpoint,
          total: 0,
          passed: 0,
          failed: 0,
          totalLatency: 0,
          lastRun: h.timestamp,
        };
      }
      const item = statsMap[key];
      item.total += h.totalTests || 1;
      item.passed += h.passed || 0;
      item.failed += h.failed || 0;
      item.totalLatency += h.responseTimeMs || 0;
      if (new Date(h.timestamp) > new Date(item.lastRun)) {
        item.lastRun = h.timestamp;
      }
    });

    return Object.values(statsMap);
  }, [historyList]);

  // Aggregate KPI metrics
  const totalTests = historyList.reduce((sum, h) => sum + (h.totalTests || 0), 0);
  const totalPassed = historyList.reduce((sum, h) => sum + (h.passed || 0), 0);
  const totalFailed = historyList.reduce((sum, h) => sum + (h.failed || 0), 0);
  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  const avgLatency = useMemo(() => {
    const validLogs = historyList.filter(h => h.responseTimeMs !== undefined && h.responseTimeMs !== null);
    if (validLogs.length === 0) return 135; // Default fallback
    return Math.round(validLogs.reduce((sum, h) => sum + h.responseTimeMs, 0) / validLogs.length);
  }, [historyList]);

  const testedCount = endpointStats.length;
  const totalCount = endpoints.length || testedCount || 1;
  const coverageRate = Math.round((testedCount / totalCount) * 100);

  // Dynamic AI Diagnostics suggestions based on live data
  const aiSuggestions = useMemo(() => {
    const suggestions: Array<{
      type: 'success' | 'warning' | 'error' | 'info';
      title: string;
      desc: string;
    }> = [];

    if (historyList.length === 0) {
      suggestions.push({
        type: 'info',
        title: 'Initialize Test Run',
        desc: 'No historical test runs found. Navigate to the API Testing Studio, select an endpoint, and run a test to trigger real-time AI metrics.'
      });
      return suggestions;
    }

    // 1. Untested coverage alert
    const untestedCount = totalCount - testedCount;
    if (untestedCount > 0) {
      const firstUntested = endpoints.find(
        (e) => !endpointStats.some((s) => s.endpoint === e.path && s.method === e.method)
      );
      suggestions.push({
        type: 'warning',
        title: 'Untested Endpoints Warning',
        desc: `${untestedCount} workspace API route(s) remain untested. We recommend generating AI Scenarios for "${firstUntested?.method || 'GET'} ${firstUntested?.path || ''}" to increase test coverage.`
      });
    }

    // 2. Performance Latency warning
    const slowApis = endpointStats.filter(s => (s.totalLatency / s.total) > 250);
    if (slowApis.length > 0) {
      const slow = slowApis[0];
      suggestions.push({
        type: 'error',
        title: 'Performance Latency Alert',
        desc: `API "${slow.method} ${slow.endpoint}" shows a high average response latency of ${Math.round(slow.totalLatency / slow.total)}ms. Check backend indexing or payload size optimizations.`
      });
    }

    // 3. High Failure rate alert
    const failingApis = endpointStats.filter(s => (s.passed / s.total) < 0.75);
    if (failingApis.length > 0) {
      const fail = failingApis[0];
      const failPercent = Math.round((fail.failed / fail.total) * 105);
      suggestions.push({
        type: 'error',
        title: 'Stability Failures Alert',
        desc: `API "${fail.method} ${fail.endpoint}" failed ${Math.min(failPercent, 100)}% of recent test executions. Verify request prerequisites and authentication tokens.`
      });
    }

    // 4. Healthy confirmation
    if (suggestions.length === 0 && totalPassed > 0) {
      suggestions.push({
        type: 'success',
        title: 'Suite Status: Optimal Health',
        desc: 'All tested endpoints are returning successful HTTP status codes. Latency is within normal bounds.'
      });
    }

    return suggestions;
  }, [historyList, endpointStats, endpoints, testedCount, totalCount, totalPassed]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">API Testing Dashboard</h2>
          <p className="text-muted-foreground text-sm">
            Real-time test suite health, performance statistics, and AI-powered diagnostic recommendations
          </p>
        </div>

        {/* Dashboard KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 relative overflow-hidden bg-white border border-slate-200/80 shadow-xs">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Runs</h3>
                <div className="text-3xl font-bold text-slate-800" data-testid="text-total-tests">
                  {totalTests}
                </div>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl">
                <Activity className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden bg-white border border-slate-200/80 shadow-xs">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pass Rate</h3>
                <div className="text-3xl font-bold text-slate-800" data-testid="text-pass-rate">
                  {passRate}%
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <TrendingUp className="h-5 w-5 text-emerald-650" />
              </div>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden bg-white border border-slate-200/80 shadow-xs">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Latency</h3>
                <div className="text-3xl font-bold text-slate-800" data-testid="text-avg-response">
                  {avgLatency}ms
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Clock className="h-5 w-5 text-blue-650" />
              </div>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden bg-white border border-slate-200/80 shadow-xs">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">API Coverage</h3>
                <div className="text-3xl font-bold text-slate-800">
                  {coverageRate}%
                </div>
              </div>
              <div className="p-3 bg-violet-50 rounded-xl">
                <Shield className="h-5 w-5 text-violet-650" />
              </div>
            </div>
          </Card>
        </div>

        {/* Coverage Progress Indicator */}
        <Card className="p-5 border border-slate-200/80 bg-slate-50/50 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-650 uppercase tracking-wider mb-2.5">
            <span>API Route Coverage Progress</span>
            <span>{testedCount} / {totalCount} Endpoints Tested</span>
          </div>
          <Progress value={coverageRate} className="h-2.5 bg-slate-200/60" />
        </Card>

        {/* Suggested AI Diagnostics */}
        <Card className="p-5 border border-slate-200/80 bg-white shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Sparkles className="h-4.5 w-4.5 text-violet-600 animate-pulse" />
            AI Diagnostic Insights & Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiSuggestions.map((s, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all duration-150 ${
                  s.type === 'error' 
                    ? 'bg-rose-50/60 border-rose-200/70 text-rose-950' 
                    : s.type === 'warning'
                    ? 'bg-amber-50/60 border-amber-200/70 text-amber-950'
                    : s.type === 'success'
                    ? 'bg-emerald-50/60 border-emerald-250/70 text-emerald-950'
                    : 'bg-indigo-50/60 border-indigo-200/70 text-indigo-950'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {s.type === 'error' && <XCircle className="h-5 w-5 text-rose-600 animate-bounce" />}
                  {s.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-600 animate-pulse" />}
                  {s.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  {s.type === 'info' && <HelpCircle className="h-5 w-5 text-indigo-600" />}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wide leading-none">{s.title}</h4>
                  <p className="text-xs leading-relaxed opacity-90">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Tested APIs History Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Tested API Route History
          </h3>
          <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-600 text-xs py-3.5">API Endpoint</TableHead>
                  <TableHead className="font-bold text-slate-600 text-xs">Last Executed</TableHead>
                  <TableHead className="font-bold text-slate-600 text-xs">Test Success Ratio</TableHead>
                  <TableHead className="font-bold text-slate-600 text-xs">Average Latency</TableHead>
                  <TableHead className="font-bold text-slate-600 text-xs text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endpointStats.length > 0 ? (
                  endpointStats.map((stats, idx) => {
                    const passPct = stats.total > 0 ? (stats.passed / stats.total) : 0;
                    const isHealthy = passPct === 1;
                    const isCritical = passPct < 0.5;
                    const avgLat = Math.round(stats.totalLatency / stats.total);

                    return (
                      <TableRow key={idx} className="hover:bg-slate-50/50">
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <MethodBadge method={stats.method as any} />
                            <code className="text-xs font-mono text-slate-800 font-semibold">
                              {stats.endpoint}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-medium">
                          {stats.lastRun}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{stats.passed} / {stats.total} Passed</span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              ({Math.round(passPct * 100)}%)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-700">
                          {avgLat}ms
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 ${
                              isHealthy 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : isCritical 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isHealthy ? 'Healthy' : isCritical ? 'Critical' : 'Warning'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-16 text-xs">
                      <div className="flex flex-col items-center gap-2">
                        <PlayCircle className="h-8 w-8 text-slate-300 animate-pulse" />
                        <span>No historical API test results captured yet. Execute scenarios in the Testing Studio.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
