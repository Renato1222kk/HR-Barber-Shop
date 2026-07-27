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
    <Card className="p-4 transition-shadow hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500">{label}</p>
          {/* Numeros sempre em preto — o destaque vem do icone, nao da cor. */}
          <p className="mt-1.5 truncate text-xl font-semibold tracking-tight text-ink-900">
            {value}
          </p>
          {hint && <p className="mt-0.5 truncate text-xs text-ink-500">{hint}</p>}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            accent ? 'bg-gold-50 text-gold-600' : 'bg-ink-100 text-ink-600'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
