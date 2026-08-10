import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, FileText, Link } from 'lucide-react';
import { MethodBadge } from '@/components/method-badge';
import { parseSwaggerSpec, parseSwaggerUrl, parsePostmanSpec } from '@/lib/api-client';
import { toast } from 'sonner';
import { Endpoint } from '@/types/api';

interface SpecImportProps {
  onEndpointsParsed: (endpoints: Endpoint[]) => void;
}

export default function SpecImport({ onEndpointsParsed }: SpecImportProps) {
  const [importMode, setImportMode] = useState<'paste' | 'url'>('paste');
  const [format, setFormat] = useState<'swagger' | 'postman'>('swagger');
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
      let response;
      if (importMode === 'paste') {
        if (format === 'swagger') {
          response = await parseSwaggerSpec(specInput);
        } else {
          response = await parsePostmanSpec(specInput);
        }
      } else {
        response = await parseSwaggerUrl(urlInput);
      }
      
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
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Import API Specification</h2>
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

        <Card className="p-4 md:p-5 space-y-4">
          {importMode === 'paste' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Select Format
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={format === 'swagger' ? 'outline' : 'ghost'}
                    onClick={() => setFormat('swagger')}
                    className={format === 'swagger' ? 'border-indigo-500 text-indigo-650 bg-indigo-50/50 hover:bg-indigo-50/50 text-xs w-full sm:w-auto text-left justify-start' : 'text-slate-500 text-xs w-full sm:w-auto text-left justify-start'}
                  >
                    Swagger / OpenAPI (JSON/YAML)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={format === 'postman' ? 'outline' : 'ghost'}
                    onClick={() => setFormat('postman')}
                    className={format === 'postman' ? 'border-indigo-500 text-indigo-650 bg-indigo-50/50 hover:bg-indigo-50/50 text-xs w-full sm:w-auto text-left justify-start' : 'text-slate-500 text-xs w-full sm:w-auto text-left justify-start'}
                  >
                    Postman Collection v2.1 (JSON)
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  {format === 'swagger' ? 'OpenAPI Specification (JSON or YAML)' : 'Postman Collection (JSON)'}
                </label>
                <Textarea
                  value={specInput}
                  onChange={(e) => setSpecInput(e.target.value)}
                  placeholder={format === 'swagger' 
                    ? "Paste your raw OpenAPI spec (JSON/YAML) here..." 
                    : "Paste your Postman Collection JSON here..."}
                  className="font-mono text-sm min-h-[300px] resize-none"
                  data-testid="textarea-spec-input"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="text-sm font-semibold text-foreground block">
                Live Swagger / OpenAPI Specification URL
              </label>
              <p className="text-xs text-muted-foreground">
                Enter the URL to your Swagger JSON definition (e.g. <code>http://localhost:3000/api-json</code>)
              </p>
              <div className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-md p-3 mb-2 space-y-2">
                <p>
                  <strong>⚠️ Localhost Notice:</strong> Because this platform runs in the cloud, it cannot directly reach your <code>localhost</code>. 
                </p>
                <p>
                  <strong>🔧 Port Forwarding & Tunnels:</strong> If you are using VS Code, you can use its built-in <strong>Port Forwarding</strong> panel to make your local port public. Alternatively, use a tunneling tool like <strong>ngrok</strong> to expose your port (e.g. <code>ngrok http 3000</code>). To prevent ngrok's browser warning page from blocking imports, bypass it by running:
                  <br />
                  <code className="block bg-slate-900 text-slate-100 p-1.5 rounded mt-1 text-[11px] font-mono">
                    ngrok http 3000 --oauth-allow-emails=YOUR_EMAIL
                  </code>
                  Or, use <strong>Localtunnel</strong> (which has no warning page by default):
                  <br />
                  <code className="block bg-slate-900 text-slate-100 p-1.5 rounded mt-1 text-[11px] font-mono">
                    npx localtunnel --port 3000
                  </code>
                </p>
                <p className="bg-amber-50 dark:bg-amber-955/20 border border-amber-250 p-2 rounded text-amber-900 dark:text-amber-300">
                  <strong>💡 Tip:</strong> If your tunnel shows an authentication or verification splash screen, open the public URL in a new tab in this same browser first, click "Visit Site" or authorize it, and then try importing here again.
                </p>
              </div>
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g. https://xxxx.loca.lt/api-json"
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
