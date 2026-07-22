import { Card } from '@/components/ui/card';
import { MethodBadge } from './method-badge';
import { Endpoint } from '@/types/api';

interface EndpointCardProps {
  endpoint: Endpoint;
  isActive: boolean;
  onClick: () => void;
}

export function EndpointCard({ endpoint, isActive, onClick }: EndpointCardProps) {
  return (
    <Card
      className={`p-3 cursor-pointer transition-all hover:shadow-md ${
        isActive
          ? 'bg-[#4f39f6] text-white border-[#4f39f6] shadow-md font-semibold'
          : 'border-l-4 border-l-transparent hover:bg-slate-50'
      }`}
      onClick={onClick}
      data-testid={`card-endpoint-${endpoint.id}`}
    >
      <div className="flex items-start gap-3">
        <MethodBadge method={endpoint.method} />
        <div className="flex-1 min-w-0">
          <code className={`text-sm font-mono block truncate ${isActive ? 'text-white' : 'text-foreground'}`} data-testid={`text-path-${endpoint.id}`}>
            {endpoint.path}
          </code>
          <p className={`text-xs mt-1 line-clamp-2 ${isActive ? 'text-indigo-100' : 'text-muted-foreground'}`} data-testid={`text-summary-${endpoint.id}`}>
            {endpoint.summary}
          </p>
        </div>
      </div>
    </Card>
  );
}
