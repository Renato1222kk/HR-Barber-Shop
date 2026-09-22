import { BookingFlow } from '@/components/booking/BookingFlow';

// Rota totalmente pública: sem sessão, sem cadastro, sem login.
export const dynamic = 'force-dynamic';

export default function AgendarPage() {
  return <BookingFlow />;
}
