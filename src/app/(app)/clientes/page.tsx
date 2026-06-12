'use client';

import { useMemo, useState } from 'react';
import { Search, UserPlus, Users, Phone } from 'lucide-react';
import { useAsync } from '@/lib/hooks';
import { listAppointments, listClients, computeClientStats } from '@/lib/data/repository';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';
import { formatWhatsappDisplay } from '@/lib/utils/whatsapp';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/Misc';
import { ClientModal } from '@/components/clients/ClientModal';
import { ClientDetail } from '@/components/clients/ClientDetail';
import type { Client, ClientWithStats } from '@/types';

export default function ClientesPage() {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [selected, setSelected] = useState<ClientWithStats | null>(null);

  const clientsQ = useAsync(() => listClients(), []);
  const apptsQ = useAsync(() => listAppointments(), []);

  const enriched = useMemo<ClientWithStats[]>(() => {
    if (!clientsQ.data || !apptsQ.data) return [];
    return computeClientStats(clientsQ.data, apptsQ.data).sort((a, b) => {
      // mais recentes / ativos primeiro
      return (b.last_visit ?? '').localeCompare(a.last_visit ?? '') || a.name.localeCompare(b.name);
    });
  }, [clientsQ.data, apptsQ.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.whatsapp ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    );
  }, [enriched, query]);

  const loading = clientsQ.loading || apptsQ.loading;
  const error = clientsQ.error || apptsQ.error;

  const openEdit = (c: ClientWithStats) => {
    setSelected(null);
    setEditing(c);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Buscar por nome ou WhatsApp"
            className="pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setCreating(true)} size="icon" className="sm:w-auto sm:px-4">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo</span>
        </Button>
      </div>

      {!loading && !error && (
        <p className="px-1 text-xs text-zinc-500">
          {filtered.length} {filtered.length === 1 ? 'cliente' : 'clientes'}
        </p>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? 'Nenhum cliente encontrado' : 'Sem clientes ainda'}
          description={query ? 'Tente outro termo de busca.' : 'Cadastre seu primeiro cliente.'}
          action={
            !query && (
              <Button onClick={() => setCreating(true)}>
                <UserPlus className="h-4 w-4" /> Novo cliente
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <Card
              key={c.id}
              onClick={() => setSelected(c)}
              className="flex cursor-pointer items-center gap-3 p-3.5 transition-colors hover:bg-ink-800"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-zinc-500">
                  {c.whatsapp ? (
                    <>
                      <Phone className="h-3 w-3" /> {formatWhatsappDisplay(c.whatsapp)}
                    </>
                  ) : (
                    'sem WhatsApp'
                  )}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
                  <span>{c.appointments_count} atend.</span>
                  {c.last_visit && <span>Ult. {formatDateShort(c.last_visit)}</span>}
                  {c.top_service && <span className="text-zinc-400">{c.top_service}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-gold">{formatCurrency(c.total_spent)}</p>
                <p className="text-[11px] text-zinc-500">total</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ClientModal open={creating} onClose={() => setCreating(false)} />
      <ClientModal open={Boolean(editing)} client={editing} onClose={() => setEditing(null)} />
      <ClientDetail
        client={selected}
        appointments={apptsQ.data ?? []}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
      />
    </div>
  );
}
