import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './status-badge';
import { ChevronDown, ChevronUp, AlertCircle, Sparkles, Copy, Maximize2 } from 'lucide-react';
import { ExecutionResult } from '@/types/api';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ExecutionResultCardProps {
  result: ExecutionResult;
}

export function ExecutionResultCard({ result }: ExecutionResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAiDiagnosis, setShowAiDiagnosis] = useState(false);

  return (
    <Card className="p-4 space-y-3 max-w-full overflow-hidden" data-testid={`card-result-${result.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground mb-2" data-testid={`text-result-name-${result.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}>
            {result.scenarioName}
          </h4>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge statusCode={result.statusCode} />
            <Badge
              variant="outline"
              className={`text-xs font-mono ${result.passed ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}
              data-testid={`badge-result-status-${result.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {result.passed ? 'PASSED' : 'FAILED'}
            </Badge>
            <span className="text-xs text-muted-foreground" data-testid={`text-response-time-${result.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}>
              {result.responseTimeMs}ms
            </span>
          </div>
        </div>
      </div>

      {result.aiExplanation && (
        showAiDiagnosis ? (
          <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg space-y-2 relative" data-testid="card-ai-explanation">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-650" />
                <Badge variant="outline" className="text-[10px] bg-violet-100/50 text-violet-750 border-violet-200/60" data-testid="badge-ai-model">
                  {result.aiModel || 'Local AI'}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setShowAiDiagnosis(false)}
                className="text-[10px] font-semibold text-violet-700 hover:text-violet-900 hover:underline cursor-pointer focus:outline-none"
              >
                Hide Diagnosis
              </button>
            </div>
            <p className="text-xs text-violet-900 leading-relaxed" data-testid="text-ai-explanation">
              {result.aiExplanation}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAiDiagnosis(true)}
            className="h-8.5 text-xs bg-violet-50/70 hover:bg-violet-100 text-violet-755 border border-violet-200/55 rounded-lg w-full flex items-center justify-between px-3 cursor-pointer focus:outline-none transition-colors duration-150 shadow-xs"
          >
            <span className="flex items-center gap-1.5 font-semibold text-violet-750">
              <Sparkles className="h-3.5 w-3.5 text-violet-600 animate-pulse" />
              AI Analysis Available
            </span>
            <span className="text-[10px] text-violet-500 font-bold uppercase tracking-wider">Click to view</span>
          </button>
        )
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs px-2 w-full justify-center"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-toggle-details-${result.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
        {expanded ? 'Hide' : 'Show'} Details
      </Button>

      {expanded && (
        <div className="space-y-3 pt-2 border-t" data-testid={`section-details-${result.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}>
          <div>
            <h5 className="text-xs font-semibold text-foreground mb-2">Request Payload</h5>
            <pre className="p-3 bg-muted rounded text-xs font-mono max-h-[300px] w-full overflow-auto whitespace-pre-wrap break-all" data-testid="text-request-payload">
              {JSON.stringify(result.requestPayload, null, 2)}
            </pre>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-xs font-semibold text-foreground">Response Body</h5>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(result.responseBody, null, 2));
                    toast.success('Response body copied to clipboard!');
                  }}
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="h-3 w-3" />
                      Expand
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-bold flex justify-between items-center pr-6">
                        <span>Response Body for: {result.scenarioName}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-slate-50 font-semibold cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(result.responseBody, null, 2));
                            toast.success('Response body copied!');
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copy JSON
                        </Button>
                      </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-4 mt-2 overflow-auto">
                      <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all leading-relaxed">
                        {JSON.stringify(result.responseBody, null, 2)}
                      </pre>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <pre className="p-3 bg-muted rounded text-xs font-mono max-h-[300px] w-full overflow-auto whitespace-pre-wrap break-all" data-testid="text-response-body">
              {JSON.stringify(result.responseBody, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </Card>
  );
}
