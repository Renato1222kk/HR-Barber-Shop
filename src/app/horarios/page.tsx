import { Suspense } from 'react';
import { BookedSlotsView } from '@/components/booking/BookedSlotsView';

// Rota totalmente pública e sempre atualizada (sem cache de página).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HorariosPage() {
  return (
    <Suspense fallback={null}>
      <BookedSlotsView />
    </Suspense>
  );
}
