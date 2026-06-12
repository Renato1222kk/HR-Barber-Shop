'use client';

import { useEffect, useState } from 'react';
import { Save, Building2, User, Phone, Timer, Clock, LogOut, Palette } from 'lucide-react';
import { useAsync } from '@/lib/hooks';
import {
  getSettings,
  listWorkingHours,
  updateSettings,
  updateWorkingHour,
} from '@/lib/data/repository';
import { WEEKDAYS } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { LoadingState, ErrorState, Toggle } from '@/components/ui/Misc';
import { emitDataChanged } from '@/lib/events';
import type { Settings, WorkingHour } from '@/types';

export default function ConfiguracoesPage() {
  const { signOut, isDemo } = useAuth();
  const settingsQ = useAsync(() => getSettings(), []);
  const hoursQ = useAsync(() => listWorkingHours(), []);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settingsQ.data) setSettings(settingsQ.data);
  }, [settingsQ.data]);
  useEffect(() => {
    if (hoursQ.data) setHours(hoursQ.data);
  }, [hoursQ.data]);

  if (settingsQ.loading || hoursQ.loading) return <LoadingState />;
  if (settingsQ.error) return <ErrorState message={settingsQ.error} />;
  if (!settings) return null;

  const setS = (patch: Partial<Settings>) => setSettings((s) => (s ? { ...s, ...patch } : s));
  const setH = (weekday: number, patch: Partial<WorkingHour>) =>
    setHours((hs) => hs.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateSettings(settings);
      await Promise.all(hours.map((h) => updateWorkingHour(h.weekday, h)));
      emitDataChanged();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const ordered = [...hours].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      {/* Dados da barbearia */}
      <Card>
        <CardHeader>
          <CardTitle>Barbearia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Nome da barbearia">
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                className="pl-10"
                value={settings.business_name}
                onChange={(e) => setS({ business_name: e.target.value })}
              />
            </div>
          </Field>
          <Field label="Nome do barbeiro">
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                className="pl-10"
                value={settings.barber_name}
                onChange={(e) => setS({ barber_name: e.target.value })}
              />
            </div>
          </Field>
          <Field label="WhatsApp" hint="Numero usado nas mensagens">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                inputMode="numeric"
                className="pl-10"
                value={settings.whatsapp}
                onChange={(e) => setS({ whatsapp: e.target.value })}
              />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Intervalo (min)" hint="Entre atendimentos">
              <div className="relative">
                <Timer className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  type="number"
                  min={0}
                  step={5}
                  className="pl-10"
                  value={settings.interval_minutes}
                  onChange={(e) => setS({ interval_minutes: Number(e.target.value) || 0 })}
                />
              </div>
            </Field>
            <Field label="Tema">
              <div className="relative">
                <Palette className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Select
                  className="pl-10"
                  value={settings.theme}
                  onChange={(e) => setS({ theme: e.target.value as Settings['theme'] })}
                >
                  <option value="dark">Escuro (padrao)</option>
                  <option value="gold">Dourado</option>
                </Select>
              </div>
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Horarios de funcionamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gold" /> Horario de funcionamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ordered.map((h) => (
            <div
              key={h.weekday}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-ink-700/60 px-3 py-2.5',
                !h.is_open && 'opacity-60'
              )}
            >
              <Toggle checked={h.is_open} onChange={(v) => setH(h.weekday, { is_open: v })} />
              <span className="w-20 text-sm font-medium text-white">{WEEKDAYS[h.weekday]}</span>
              {h.is_open ? (
                <div className="flex flex-1 items-center justify-end gap-2">
                  <Input
                    type="time"
                    className="h-9 w-28 text-center"
                    value={h.start_time?.slice(0, 5)}
                    onChange={(e) => setH(h.weekday, { start_time: e.target.value })}
                  />
                  <span className="text-zinc-500">—</span>
                  <Input
                    type="time"
                    className="h-9 w-28 text-center"
                    value={h.end_time?.slice(0, 5)}
                    onChange={(e) => setH(h.weekday, { end_time: e.target.value })}
                  />
                </div>
              ) : (
                <span className="flex-1 text-right text-sm text-zinc-500">Fechado</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving} size="lg" className="flex-1">
          <Save className="h-4 w-4" />
          {saved ? 'Salvo!' : 'Salvar alteracoes'}
        </Button>
      </div>

      {isDemo && (
        <p className="rounded-xl bg-gold/10 px-4 py-3 text-center text-xs text-gold">
          Modo demonstracao: as alteracoes valem ate recarregar a pagina. Configure o Supabase para
          persistir.
        </p>
      )}

      <Button variant="outline" className="w-full" onClick={() => signOut()}>
        <LogOut className="h-4 w-4" /> Sair da conta
      </Button>
    </div>
  );
}
