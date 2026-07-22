import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  statusCode: number;
  className?: string;
}

export function StatusBadge({ statusCode, className }: StatusBadgeProps) {
  let color = 'bg-slate-100 text-slate-700 border-slate-200';
  
  if (statusCode >= 200 && statusCode < 300) {
    color = 'bg-emerald-100 text-emerald-700 border-emerald-200';
  } else if (statusCode >= 400 && statusCode < 500) {
    color = 'bg-amber-100 text-amber-700 border-amber-200';
  } else if (statusCode >= 500) {
    color = 'bg-rose-100 text-rose-700 border-rose-200';
  }

  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs font-semibold px-2 py-0.5 ${color} ${className || ''}`}
      data-testid={`badge-status-${statusCode}`}
    >
      {statusCode}
    </Badge>
  );
}
