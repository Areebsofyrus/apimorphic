import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Scenario } from '@/types/api';
import { toast } from 'sonner';

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected: boolean;
  onToggle: (selected: boolean) => void;
  onLoadIntoEditor?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  onUpdatePayload?: (updatedPayload: Record<string, unknown>) => Promise<void>;
}

const RULE_COLORS: Record<string, string> = {
  'schema-conformant': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'null-injection': 'bg-amber-100 text-amber-700 border-amber-200',
  'empty-string': 'bg-amber-100 text-amber-700 border-amber-200',
  'security-sqli': 'bg-rose-100 text-rose-700 border-rose-200',
  'security-xss': 'bg-rose-100 text-rose-700 border-rose-200',
  'ai-edge-case': 'bg-violet-100 text-violet-700 border-violet-200',
  'ai_enriched': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'manual': 'bg-blue-100 text-blue-700 border-blue-200',
};

export function ScenarioCard({
  scenario,
  isSelected,
  onToggle,
  onLoadIntoEditor,
  onDelete,
  onSave,
  onUpdatePayload,
}: ScenarioCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [localPayload, setLocalPayload] = useState(JSON.stringify(scenario.payload || {}, null, 2));
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setLocalPayload(JSON.stringify(scenario.payload || {}, null, 2));
  }, [scenario.payload]);

  return (
    <Card className="p-4" data-testid={`card-scenario-${scenario.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          data-testid={`checkbox-scenario-${scenario.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground" data-testid={`text-scenario-name-${scenario.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}>
                {scenario.scenarioName}
              </h4>
              <Badge
                variant="outline"
                className={`text-xs font-mono ${RULE_COLORS[scenario.generationRule] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
                data-testid={`badge-rule-${scenario.generationRule}`}
              >
                {scenario.generationRule}
              </Badge>
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                onClick={onDelete}
                data-testid={`button-delete-scenario-${scenario.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-2" data-testid={`text-expected-${scenario.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}>
            Expected: {scenario.expectedResult}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setExpanded(!expanded)}
            data-testid={`button-toggle-payload-${scenario.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {expanded ? 'Hide' : 'Show'} Payload
          </Button>
          {onLoadIntoEditor && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 ml-2"
              onClick={onLoadIntoEditor}
              data-testid={`button-load-scenario-${scenario.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}
            >
              Load into Editor
            </Button>
          )}
          {onSave && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 ml-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-semibold"
              onClick={onSave}
              data-testid={`button-save-scenario-${scenario.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}
            >
              Save to Suite
            </Button>
          )}
          {expanded && (
            <div className="mt-3 space-y-2">
              <textarea
                className="w-full h-32 p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                value={localPayload}
                onChange={(e) => setLocalPayload(e.target.value)}
              />
              {onUpdatePayload && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdating}
                    className="h-7 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold shadow-sm"
                    onClick={async () => {
                      try {
                        setIsUpdating(true);
                        const parsed = JSON.parse(localPayload);
                        await onUpdatePayload(parsed);
                        toast.success('Payload updated successfully!');
                      } catch {
                        toast.error('Invalid JSON format. Please verify syntax.');
                      } finally {
                        setIsUpdating(false);
                      }
                    }}
                  >
                    {isUpdating ? 'Updating...' : 'Save Payload Changes'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
