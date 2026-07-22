import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './status-badge';
import { ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react';
import { ExecutionResult } from '@/types/api';

interface ExecutionResultCardProps {
  result: ExecutionResult;
}

export function ExecutionResultCard({ result }: ExecutionResultCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-4 space-y-3" data-testid={`card-result-${result.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}>
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
        <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg space-y-2" data-testid="card-ai-explanation">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <Badge variant="outline" className="text-xs bg-violet-100 text-violet-700 border-violet-200" data-testid="badge-ai-model">
              gemma-4-E2B
            </Badge>
          </div>
          <p className="text-xs text-violet-900 leading-relaxed" data-testid="text-ai-explanation">
            {result.aiExplanation}
          </p>
        </div>
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
            <pre className="p-3 bg-muted rounded text-xs font-mono overflow-x-auto" data-testid="text-request-payload">
              {JSON.stringify(result.requestPayload, null, 2)}
            </pre>
          </div>
          <div>
            <h5 className="text-xs font-semibold text-foreground mb-2">Response Body</h5>
            <pre className="p-3 bg-muted rounded text-xs font-mono overflow-x-auto" data-testid="text-response-body">
              {JSON.stringify(result.responseBody, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </Card>
  );
}
