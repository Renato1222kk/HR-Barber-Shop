'use client';

import { useEffect, useState } from 'react';
import {
  Save,
  Building2,
  User,
  Phone,
  MapPin,
  Timer,
  Clock,
  LogOut,
  Smartphone,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAsync } from '@/lib/hooks';
import { getSettings, listWorkingHours, updateSettings, updateWorkingHour } from '@/services';
import { BRAND, WEEKDAYS } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { errorMessage } from '@/lib/utils/error';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { LoadingState, ErrorState, Toggle } from '@/components/ui/Misc';
import { LogoMark } from '@/components/brand/Logo';
import { DemoMigrationCard } from '@/components/settings/DemoMigrationCard';
import { InstallAppButton, InstalledBadge } from '@/components/pwa/InstallAppButton';
import { emitDataChanged } from '@/lib/events';
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
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data) setSettings(settingsQ.data);
  }, [settingsQ.data]);
  useEffect(() => {
    if (hoursQ.data) setHours(hoursQ.data);
  }, [hoursQ.data]);

  if (settingsQ.loading || hoursQ.loading) return <LoadingState />;
  if (settingsQ.error) return <ErrorState message={settingsQ.error} />;
  if (hoursQ.error) return <ErrorState message={hoursQ.error} />;
  if (!settings) return null;

  const setS = (patch: Partial<Settings>) => setSettings((s) => (s ? { ...s, ...patch } : s));
  const setH = (weekday: number, patch: Partial<WorkingHour>) =>
    setHours((hs) => hs.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await updateSettings(settings);
      await Promise.all(hours.map((h) => updateWorkingHour(h.weekday, h)));
      emitDataChanged();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(errorMessage(e, 'Não foi possível salvar as configurações.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const ordered = [...hours].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      {/* Identidade da barbearia */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-5">
          <LogoMark size="lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink-900">{BRAND.name}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
              Logo oficial usada no login, no menu e na instalação do aplicativo.
            </p>
            {user?.email && (
              <p className="mt-1.5 truncate text-xs text-ink-500">
                Conectado como <span className="text-ink-700">{user.email}</span>
              </p>
            )}
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
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <Input
                className="pl-10"
                value={settings.business_name}
                onChange={(e) => setS({ business_name: e.target.value })}
              />
            </div>
          </Field>
          <Field label="Responsável">
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <Input
                className="pl-10"
                value={settings.owner_name}
                onChange={(e) => setS({ owner_name: e.target.value })}
              />
            </div>
          </Field>
          <Field label="WhatsApp" hint="Número usado nas mensagens">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <Input
                inputMode="numeric"
                className="pl-10"
                value={settings.whatsapp}
                onChange={(e) => setS({ whatsapp: e.target.value })}
              />
            </div>
          </Field>
          <Field label="Endereço">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <Input
                className="pl-10"
                placeholder="Rua, número — bairro, cidade"
                value={settings.address}
                onChange={(e) => setS({ address: e.target.value })}
              />
            </div>
          </Field>
          {/* O tema deixou de ser configuravel: o app tem uma unica
              identidade clara. O valor continua salvo como "light". */}
          <Field label="Intervalo (min)" hint="Entre atendimentos">
            <div className="relative">
              <Timer className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
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
        </CardContent>
      </Card>

      {/* Horarios de funcionamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gold-600" /> Horário de funcionamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ordered.map((h) => (
            <div
              key={h.weekday}
              className={cn(
                'flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 px-3 py-2.5',
                !h.is_open && 'opacity-60'
              )}
            >
              <Toggle checked={h.is_open} onChange={(v) => setH(h.weekday, { is_open: v })} />
              <span className="w-20 text-sm font-medium text-ink-900">{WEEKDAYS[h.weekday]}</span>
              {h.is_open ? (
                <div className="flex flex-1 items-center justify-end gap-2">
                  <Input
                    type="time"
                    aria-label={`Abertura ${WEEKDAYS[h.weekday]}`}
                    className="h-10 w-28 text-center"
                    value={h.start_time?.slice(0, 5)}
                    onChange={(e) => setH(h.weekday, { start_time: e.target.value })}
                  />
                  <span className="text-ink-500">—</span>
                  <Input
                    type="time"
                    aria-label={`Fechamento ${WEEKDAYS[h.weekday]}`}
                    className="h-10 w-28 text-center"
                    value={h.end_time?.slice(0, 5)}
                    onChange={(e) => setH(h.weekday, { end_time: e.target.value })}
                  />
                </div>
              ) : (
                <span className="flex-1 text-right text-sm text-ink-500">Fechado</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {saveError && <ErrorState message={saveError} />}

      <Button onClick={save} loading={saving} size="lg" className="w-full">
        <Save className="h-4 w-4" />
        {saved ? 'Salvo!' : 'Salvar alterações'}
      </Button>

      {/* Instalacao do PWA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-gold-600" /> Aplicativo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs leading-relaxed text-ink-500">
            Instale o HR Barber Shop no celular ou no computador para abrir direto pelo ícone,
            em tela cheia e sem a barra do navegador.
          </p>
          <InstalledBadge />
          <InstallAppButton />
        </CardContent>
      </Card>

      {/* Aparece somente quando existem dados antigos neste navegador. */}
      <DemoMigrationCard />

      <Button variant="outline" className="w-full" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" /> Sair da conta
      </Button>
    </div>
  );
}
