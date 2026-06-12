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
import { listAppointments, listClients } from '@/lib/data/repository';
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
  gold: 'bg-gold/15 text-gold',
  green: 'bg-green-500/15 text-green-400',
  red: 'bg-red-500/15 text-red-400',
  blue: 'bg-blue-500/15 text-blue-400',
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
      <div className="flex items-center gap-3 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 to-transparent p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/20 text-gold">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Insights automaticos</h2>
          <p className="text-xs text-zinc-400">Gerados a partir dos seus agendamentos.</p>
        </div>
      </div>

      {insights.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Ainda sem insights"
          description="Registre alguns atendimentos para gerar analises automaticas."
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
                <p className="pt-1 text-sm leading-snug text-zinc-200">{ins.title}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
