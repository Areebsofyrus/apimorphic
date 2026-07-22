import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, FileText, Link } from 'lucide-react';
import { MethodBadge } from '@/components/method-badge';
import { parseSwaggerSpec, parseSwaggerUrl } from '@/lib/api-client';
import { toast } from 'sonner';
import { Endpoint } from '@/types/api';

interface SpecImportProps {
  onEndpointsParsed: (endpoints: Endpoint[]) => void;
}

export default function SpecImport({ onEndpointsParsed }: SpecImportProps) {
  const [importMode, setImportMode] = useState<'paste' | 'url'>('paste');
  const [specInput, setSpecInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<{
    title: string;
    version: string;
    baseUrl: string;
    endpoints: Endpoint[];
  } | null>(null);

  const handleParse = async () => {
    if (importMode === 'paste' && !specInput.trim()) {
      toast.error('Please enter a spec to parse');
      return;
    }
    if (importMode === 'url' && !urlInput.trim()) {
      toast.error('Please enter a Swagger URL');
      return;
    }

    setIsParsing(true);
    try {
      const response = importMode === 'paste'
        ? await parseSwaggerSpec(specInput)
        : await parseSwaggerUrl(urlInput);
      
      const result = response.result || response;
      setParsedData(result);
      onEndpointsParsed(result.endpoints);
      toast.success(`Successfully parsed ${result.endpoints.length} endpoints`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse spec. Please check the format.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Import OpenAPI Specification</h2>
          <p className="text-muted-foreground text-sm">
            Paste your raw JSON/YAML spec or load it from a live URL to discover endpoints.
          </p>
        </div>

        {/* Mode Switcher Buttons */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-lg w-fit">
          <Button
            size="sm"
            variant={importMode === 'paste' ? 'default' : 'ghost'}
            className="text-xs"
            onClick={() => setImportMode('paste')}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Paste Content
          </Button>
          <Button
            size="sm"
            variant={importMode === 'url' ? 'default' : 'ghost'}
            className="text-xs"
            onClick={() => setImportMode('url')}
          >
            <Link className="h-3.5 w-3.5 mr-1" />
            Import via Live URL
          </Button>
        </div>

        <Card className="p-5 space-y-4">
          {importMode === 'paste' ? (
            <div>
              <label className="text-sm font-semibold text-foreground mb-3 block">
                OpenAPI Specification (JSON or YAML)
              </label>
              <Textarea
                value={specInput}
                onChange={(e) => setSpecInput(e.target.value)}
                placeholder="Paste your raw OpenAPI spec (JSON/YAML) here..."
                className="font-mono text-sm min-h-[300px] resize-none"
                data-testid="textarea-spec-input"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground block">
                Live Swagger / OpenAPI Specification URL
              </label>
              <p className="text-xs text-muted-foreground">
                Enter the URL to your Swagger JSON definition (e.g. <code>http://localhost:3000/api-json</code>)
              </p>
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g. http://localhost:3000/api-json"
                className="font-mono text-sm"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleParse}
              disabled={isParsing || (importMode === 'paste' ? !specInput.trim() : !urlInput.trim())}
              data-testid="button-parse-spec"
            >
              {isParsing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isParsing ? 'Parsing...' : 'Parse & Discover APIs'}
            </Button>
          </div>
        </Card>

        {parsedData && (
          <Card className="p-6 bg-emerald-50 border-emerald-200" data-testid="card-parse-success">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-emerald-700" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-emerald-900" data-testid="text-parsed-title">
                    {parsedData.title}
                  </h3>
                  <p className="text-sm text-emerald-700 font-medium">
                    Version {parsedData.version} • Base URL: {parsedData.baseUrl}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-200 text-emerald-800 border-emerald-300" data-testid="badge-endpoint-count">
                    {parsedData.endpoints.length} endpoints discovered
                  </Badge>
                </div>
                <div className="space-y-2 pt-2">
                  <h4 className="text-sm font-semibold text-emerald-900">Discovered Endpoints:</h4>
                  <div className="space-y-2">
                    {parsedData.endpoints.slice(0, 10).map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className="flex items-center gap-3 p-2 bg-white rounded border border-emerald-200"
                        data-testid={`card-discovered-endpoint-${endpoint.id}`}
                      >
                        <MethodBadge method={endpoint.method} />
                        <code className="text-sm font-mono text-foreground" data-testid={`text-discovered-path-${endpoint.id}`}>
                          {endpoint.path}
                        </code>
                        <span className="text-xs text-muted-foreground">
                          {endpoint.summary}
                        </span>
                      </div>
                    ))}
                    {parsedData.endpoints.length > 10 && (
                      <p className="text-xs text-emerald-700 text-center py-2 font-semibold">
                        and {parsedData.endpoints.length - 10} more...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
