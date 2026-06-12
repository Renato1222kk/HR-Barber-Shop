import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/Card';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  accent?: boolean;
}

export function StatCard({ label, value, icon: Icon, hint, accent }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <p
            className={cn(
              'mt-1.5 truncate text-xl font-semibold tracking-tight',
              accent ? 'text-gold' : 'text-white'
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-0.5 truncate text-xs text-zinc-500">{hint}</p>}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            accent ? 'bg-gold/15 text-gold' : 'bg-ink-700 text-zinc-300'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
