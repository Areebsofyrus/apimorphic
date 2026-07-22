import { Badge } from '@/components/ui/badge';

interface MethodBadgeProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  className?: string;
}

const METHOD_STYLES = {
  GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-100 text-blue-700 border-blue-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  DELETE: 'bg-rose-100 text-rose-700 border-rose-200',
  PATCH: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

export function MethodBadge({ method, className }: MethodBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs font-semibold px-2 py-0.5 ${METHOD_STYLES[method]} ${className || ''}`}
      data-testid={`badge-method-${method.toLowerCase()}`}
    >
      {method}
    </Badge>
  );
}
