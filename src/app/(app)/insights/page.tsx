'use client';

import { useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Scissors,
  AlertTriangle,
  User,
  DollarSign,
  Trophy,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useAsync } from '@/lib/hooks';
import { listAppointments, listClients } from '@/services';
import { buildInsights, type Insight } from '@/lib/data/analytics';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/Card';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/Misc';

const ICONS: Record<Insight['icon'], LucideIcon> = {
  calendar: Calendar,
  clock: Clock,
  scissors: Scissors,
  alert: AlertTriangle,
  user: User,
  money: DollarSign,
  trophy: Trophy,
  trend: TrendingUp,
};

const TONES: Record<Insight['tone'], string> = {
  gold: 'bg-gold-50 text-gold-700',
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-700',
};

export default function InsightsPage() {
  const apptsQ = useAsync(() => listAppointments(), []);
  const clientsQ = useAsync(() => listClients(), []);

  const insights = useMemo(() => {
    if (!apptsQ.data || !clientsQ.data) return [];
    return buildInsights(apptsQ.data, clientsQ.data, new Date());
  }, [apptsQ.data, clientsQ.data]);

  const loading = apptsQ.loading || clientsQ.loading;
  const error = apptsQ.error || clientsQ.error;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Insights automáticos</h2>
          <p className="text-xs text-ink-600">Gerados a partir dos dados da barbearia.</p>
        </div>
      </div>

      {insights.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Ainda sem insights"
          description="Registre alguns atendimentos para gerar análises automáticas."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {insights.map((ins) => {
            const Icon = ICONS[ins.icon];
            return (
              <Card key={ins.id} className="flex items-start gap-3.5 p-4">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    TONES[ins.tone]
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="pt-1 text-sm leading-snug text-ink-900">{ins.title}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
