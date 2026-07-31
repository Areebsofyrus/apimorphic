import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Scenario } from '@/types/api';
import { toast } from 'sonner';

export const HTTP_STATUS_DESCRIPTIONS: Record<string, string> = {
  '100': 'Continue',
  '101': 'Switching Protocols',
  '200': 'OK',
  '201': 'Created',
  '202': 'Accepted',
  '204': 'No Content',
  '206': 'Partial Content',
  '300': 'Multiple Choices',
  '301': 'Moved Permanently',
  '302': 'Found',
  '304': 'Not Modified',
  '307': 'Temporary Redirect',
  '308': 'Permanent Redirect',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '402': 'Payment Required',
  '403': 'Forbidden',
  '404': 'Not Found',
  '405': 'Method Not Allowed',
  '406': 'Not Acceptable',
  '408': 'Request Timeout',
  '409': 'Conflict',
  '410': 'Gone',
  '412': 'Precondition Failed',
  '413': 'Payload Too Large',
  '415': 'Unsupported Media Type',
  '422': 'Unprocessable Entity',
  '429': 'Too Many Requests',
  '500': 'Internal Server Error',
  '501': 'Not Implemented',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '504': 'Gateway Timeout'
};

export function getStatusSuggestion(input: string): string | null {
  const match = input.match(/\b\d{3}\b/);
  if (!match) return null;
  const code = match[0];
  const desc = HTTP_STATUS_DESCRIPTIONS[code];
  if (!desc) return null;
  const standard = `${code} ${desc}`;
  return input === standard ? null : standard;
}

export function getExpectedDisplay(expected: string): string {
  if (!expected) return '';
  const code = expected.trim();
  const desc = HTTP_STATUS_DESCRIPTIONS[code];
  return desc ? `${code} (${desc})` : expected;
}

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected: boolean;
  onToggle: (selected: boolean) => void;
  onLoadIntoEditor?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  onUpdatePayload?: (updatedPayload: Record<string, unknown>, updatedExpectedResult: string, updatedTag: string) => Promise<void>;
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
  const [localExpectedResult, setLocalExpectedResult] = useState(scenario.expectedResult || '');
  const [localTag, setLocalTag] = useState(scenario.generationRule || 'manual');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setLocalPayload(JSON.stringify(scenario.payload || {}, null, 2));
    setLocalExpectedResult(scenario.expectedResult || '');
    setLocalTag(scenario.generationRule || 'manual');
  }, [scenario.payload, scenario.expectedResult, scenario.generationRule]);

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
            <div className="flex items-center gap-1.5 flex-wrap">
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
              {scenario.priority && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono font-bold capitalize ${
                    scenario.priority.toLowerCase() === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                    scenario.priority.toLowerCase() === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    scenario.priority.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {scenario.priority}
                </Badge>
              )}
              {scenario.category && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border-indigo-200"
                >
                  {scenario.category}
                </Badge>
              )}
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
          <p className="text-xs text-muted-foreground mb-1" data-testid={`text-expected-${scenario.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}>
            Expected: {getExpectedDisplay(scenario.expectedResult)}
          </p>
          {scenario.description && (
            <p className="text-xs text-slate-500 mb-2 mt-1 leading-relaxed italic">
              {scenario.description}
            </p>
          )}
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
            <div className="mt-3 space-y-3 border-t pt-3 border-slate-100/80">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Expected Outcome / Status Code
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 text-xs bg-slate-950 text-slate-100 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={localExpectedResult}
                    onChange={(e) => setLocalExpectedResult(e.target.value)}
                    placeholder="e.g. 200 OK, 400 Bad Request, success"
                  />
                  {HTTP_STATUS_DESCRIPTIONS[localExpectedResult.trim()] && (
                    <span className="text-[10px] text-emerald-500 font-semibold block mt-1">
                      Matched: {HTTP_STATUS_DESCRIPTIONS[localExpectedResult.trim()]}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Scenario Tag / Rule
                  </label>
                  <input
                    list={`rule-suggestions-${scenario.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}
                    type="text"
                    className="w-full p-2 text-xs bg-slate-950 text-slate-100 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={localTag}
                    onChange={(e) => setLocalTag(e.target.value)}
                    placeholder="e.g. manual, security-sqli, custom-tag"
                  />
                  <datalist id={`rule-suggestions-${scenario.scenarioName.toLowerCase().replace(/\s+/g, '-')}`}>
                    <option value="manual" />
                    <option value="schema-conformant" />
                    <option value="null-injection" />
                    <option value="empty-string" />
                    <option value="security-sqli" />
                    <option value="security-xss" />
                    <option value="ai-edge-case" />
                    <option value="ai_enriched" />
                  </datalist>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Payload JSON
                </label>
                <textarea
                  className="w-full h-32 p-3 font-mono text-xs bg-slate-950 text-slate-100 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                  value={localPayload}
                  onChange={(e) => setLocalPayload(e.target.value)}
                />
              </div>
              {scenario.assertions && scenario.assertions.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Expected Assertions
                  </label>
                  <ul className="list-disc list-inside text-xs text-slate-600 bg-slate-50 border border-slate-200/60 rounded-lg p-2.5 space-y-1 font-mono">
                    {scenario.assertions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
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
                        await onUpdatePayload(parsed, localExpectedResult, localTag);
                        toast.success('Scenario updated successfully!');
                      } catch {
                        toast.error('Invalid JSON format. Please verify syntax.');
                      } finally {
                        setIsUpdating(false);
                      }
                    }}
                  >
                    {isUpdating ? 'Updating...' : 'Save Changes'}
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
