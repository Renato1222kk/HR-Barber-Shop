'use client';

import { useCallback, useEffect, useState } from 'react';
import { onDataChanged } from './events';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Executa um fetcher async, expoe loading/erro e refaz quando os dados mudam.
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => setData(d))
      .catch((e) => setError(e?.message ?? 'Erro ao carregar dados.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  // Refaz quando algo dispara emitDataChanged()
  useEffect(() => onDataChanged(run), [run]);

  return { data, loading, error, reload: run };
}
