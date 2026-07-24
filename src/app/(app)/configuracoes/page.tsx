'use client';

import { useEffect, useState } from 'react';
import {
  Save,
  Building2,
  User,
  Phone,
  Timer,
  Clock,
  LogOut,
  Palette,
  Database,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAsync } from '@/lib/hooks';
import {
  getSettings,
  listWorkingHours,
  updateSettings,
  updateWorkingHour,
} from '@/lib/data/repository';
import {
  detectLegacyData,
  isMigrationDone,
  migrateLegacyData,
  finalizeMigration,
  type LegacyCounts,
  type MigrationResult,
} from '@/lib/data/demo-migration';
import { WEEKDAYS } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { LoadingState, ErrorState, Toggle } from '@/components/ui/Misc';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LogoImage } from '@/components/brand/Logo';
import { emitDataChanged } from '@/lib/events';
import { errorMessage } from '@/lib/utils/error';
import { BRAND } from '@/lib/constants';
import type { Settings, WorkingHour } from '@/types';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const settingsQ = useAsync(() => getSettings(), []);
  const hoursQ = useAsync(() => listWorkingHours(), []);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ---- Migração dos dados de demonstração ----
  const [legacy, setLegacy] = useState<{ present: boolean; counts: LegacyCounts } | null>(null);
  const [confirmMigrate, setConfirmMigrate] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data) setSettings(settingsQ.data);
  }, [settingsQ.data]);
  useEffect(() => {
    if (hoursQ.data) setHours(hoursQ.data);
  }, [hoursQ.data]);

  // Detecta dados antigos apenas no cliente e se a migração ainda não ocorreu.
  useEffect(() => {
    if (isMigrationDone()) {
      setLegacy({ present: false, counts: { barbers: 0, services: 0, clients: 0, appointments: 0 } });
      return;
    }
    setLegacy(detectLegacyData());
  }, []);

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

  const runMigration = async () => {
    setMigrating(true);
    setMigrationError(null);
    try {
      const result = await migrateLegacyData();
      finalizeMigration();
      setMigrationResult(result);
      setLegacy({ present: false, counts: { barbers: 0, services: 0, clients: 0, appointments: 0 } });
      setConfirmMigrate(false);
      emitDataChanged();
    } catch (e) {
      setMigrationError(errorMessage(e, 'Falha ao migrar os dados.'));
    } finally {
      setMigrating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const ordered = [...hours].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
  const showMigration = legacy?.present && !migrationResult;

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      {/* Identidade da barbearia */}
      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <LogoImage size="md" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">{BRAND.name}</p>
            <p className="truncate text-sm text-zinc-500">
              {user?.email ?? 'Conta administrativa'}
            </p>
          </div>
        </CardContent>
      </Card>

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
          <Field label="Responsável">
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                className="pl-10"
                value={settings.owner_name}
                onChange={(e) => setS({ owner_name: e.target.value })}
              />
            </div>
          </Field>
          <Field label="WhatsApp" hint="Número usado nas mensagens">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <option value="dark">Escuro (padrão)</option>
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
            <Clock className="h-4 w-4 text-gold" /> Horário de funcionamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ordered.map((h) => (
            <div
              key={h.weekday}
              className={cn(
                'flex flex-wrap items-center gap-3 rounded-xl border border-ink-700/60 px-3 py-2.5',
                !h.is_open && 'opacity-60'
              )}
            >
              <Toggle checked={h.is_open} onChange={(v) => setH(h.weekday, { is_open: v })} />
              <span className="w-20 text-sm font-medium text-white">{WEEKDAYS[h.weekday]}</span>
              {h.is_open ? (
                <div className="flex flex-1 items-center justify-end gap-2">
                  <Input
                    type="time"
                    aria-label={`Abertura ${WEEKDAYS[h.weekday]}`}
                    className="h-10 w-28 text-center"
                    value={h.start_time?.slice(0, 5)}
                    onChange={(e) => setH(h.weekday, { start_time: e.target.value })}
                  />
                  <span className="text-zinc-500">—</span>
                  <Input
                    type="time"
                    aria-label={`Fechamento ${WEEKDAYS[h.weekday]}`}
                    className="h-10 w-28 text-center"
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

      <Button onClick={save} loading={saving} size="lg" className="w-full">
        <Save className="h-4 w-4" />
        {saved ? 'Salvo!' : 'Salvar alterações'}
      </Button>

      {/* Migração dos dados de demonstração */}
      {showMigration && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gold" /> Migrar dados da demonstração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed text-zinc-400">
              Encontramos dados antigos salvos neste navegador. Você pode importá-los para a sua
              conta no Supabase (eles passarão a ficar disponíveis em qualquer dispositivo).
            </p>
            <ul className="grid grid-cols-2 gap-2 text-sm text-zinc-300 sm:grid-cols-4">
              <li className="rounded-lg bg-ink-900 px-3 py-2 text-center">
                <span className="block text-lg font-semibold text-white">
                  {legacy?.counts.barbers}
                </span>
                barbeiros
              </li>
              <li className="rounded-lg bg-ink-900 px-3 py-2 text-center">
                <span className="block text-lg font-semibold text-white">
                  {legacy?.counts.services}
                </span>
                serviços
              </li>
              <li className="rounded-lg bg-ink-900 px-3 py-2 text-center">
                <span className="block text-lg font-semibold text-white">
                  {legacy?.counts.clients}
                </span>
                clientes
              </li>
              <li className="rounded-lg bg-ink-900 px-3 py-2 text-center">
                <span className="block text-lg font-semibold text-white">
                  {legacy?.counts.appointments}
                </span>
                agendamentos
              </li>
            </ul>
            {migrationError && <ErrorState message={migrationError} />}
            <Button className="w-full" onClick={() => setConfirmMigrate(true)}>
              <UploadCloud className="h-4 w-4" /> Migrar para o Supabase
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resultado da migração */}
      {migrationResult && (
        <Card>
          <CardContent className="space-y-2 py-5">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Migração concluída!</span>
            </div>
            <p className="text-sm text-zinc-400">
              Barbeiros: {migrationResult.barbers.imported} novos ·{' '}
              {migrationResult.barbers.reused} já existentes · Serviços:{' '}
              {migrationResult.services.imported} novos · Clientes:{' '}
              {migrationResult.clients.imported} novos · Agendamentos:{' '}
              {migrationResult.appointments.imported} importados ·{' '}
              {migrationResult.appointments.skipped} ignorados.
            </p>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="w-full" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" /> Sair da conta
      </Button>

      <ConfirmDialog
        open={confirmMigrate}
        title="Migrar dados da demonstração?"
        description="Os dados antigos deste navegador serão importados para a sua conta no Supabase. Registros já existentes não serão duplicados. Ao final, a base local antiga será removida."
        confirmLabel="Migrar agora"
        loading={migrating}
        onConfirm={runMigration}
        onClose={() => setConfirmMigrate(false)}
      />
    </div>
  );
}
