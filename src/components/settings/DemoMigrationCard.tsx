'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, DatabaseBackup, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/Misc';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { emitDataChanged } from '@/lib/events';
import { errorMessage } from '@/lib/utils/error';
import {
  clearLegacyData,
  countLegacyData,
  importLegacyData,
  isMigrationDone,
  type ImportResult,
  type LegacyCounts,
} from '@/lib/data/migrate-demo';

/**
 * Traz para o Supabase os dados que ficaram no navegador na versao de
 * demonstracao. O cartao so aparece quando existe algo para importar.
 */
export function DemoMigrationCard() {
  const [counts, setCounts] = useState<LegacyCounts | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A leitura e do localStorage: so acontece depois da montagem, para nao
  // gerar diferenca de hidratacao. Se a migracao ja foi feita neste
  // navegador, o cartao nao volta a aparecer.
  useEffect(() => {
    setCounts(isMigrationDone() ? null : countLegacyData());
  }, []);

  if (!counts && !result) return null;

  const runImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const outcome = await importLegacyData();
      setResult(outcome);
      // Os dados antigos so saem do navegador depois de a importacao
      // terminar; se algo falhar, eles continuam disponiveis.
      if (outcome.errors.length === 0) {
        clearLegacyData();
        setCounts(null);
      }
      emitDataChanged();
      setConfirming(false);
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível importar os dados.'));
    } finally {
      setImporting(false);
    }
  };

  const finishAndClear = () => {
    clearLegacyData();
    setCounts(null);
    setResult(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="h-4 w-4 text-gold-600" /> Migrar dados da demonstração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <ErrorState message={error} />}

          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">Importação concluída.</p>
              </div>
              <div className="space-y-1.5">
                <ResultRow label="Barbeiros" outcome={result.barbers} />
                <ResultRow label="Serviços" outcome={result.services} />
                <ResultRow label="Clientes" outcome={result.clients} />
                <ResultRow label="Agendamentos" outcome={result.appointments} />
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-ink-600">
                    {result.errors.length} registro(s) não puderam ser importados. Os dados
                    antigos foram mantidos no navegador.
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-white p-3">
                    {result.errors.slice(0, 20).map((message, i) => (
                      <li key={i} className="text-[11px] leading-relaxed text-ink-500">
                        {message}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full" onClick={finishAndClear}>
                    Descartar os dados antigos mesmo assim
                  </Button>
                </div>
              )}
            </div>
          ) : (
            counts && (
              <>
                <p className="text-sm leading-relaxed text-ink-600">
                  Encontramos dados da versão de demonstração salvos neste navegador. Eles podem
                  ser enviados para a sua conta no Supabase, mantendo os vínculos entre
                  agendamentos, clientes, serviços e barbeiros.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <CountBox label="Barbeiros" value={counts.barbers} />
                  <CountBox label="Serviços" value={counts.services} />
                  <CountBox label="Clientes" value={counts.clients} />
                  <CountBox label="Agendamentos" value={counts.appointments} />
                </div>
                <Button className="w-full" onClick={() => setConfirming(true)}>
                  <Upload className="h-4 w-4" /> Importar {counts.total} registro(s)
                </Button>
              </>
            )
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirming}
        title="Importar dados da demonstração?"
        description={
          counts
            ? `${counts.total} registro(s) serão enviados para a sua conta. Registros que já ` +
              'existirem não serão duplicados. Os dados antigos só são apagados do navegador ' +
              'após a importação terminar.'
            : ''
        }
        confirmLabel="Importar"
        loading={importing}
        onConfirm={runImport}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}

function CountBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2.5 text-center">
      <p className="text-lg font-semibold text-ink-900">{value}</p>
      <p className="text-[11px] text-ink-500">{label}</p>
    </div>
  );
}

function ResultRow({
  label,
  outcome,
}: {
  label: string;
  outcome: { imported: number; skipped: number };
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
      <span className="text-ink-700">{label}</span>
      <span className="text-xs text-ink-500">
        <span className="font-semibold text-ink-900">{outcome.imported}</span> importado(s)
        {outcome.skipped > 0 && ` · ${outcome.skipped} já existente(s)`}
      </span>
    </div>
  );
}
