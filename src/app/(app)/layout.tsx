import { AppShell } from '@/components/layout/AppShell';

// Nenhuma rota e bloqueada: esta versao roda inteiramente em modo demonstracao.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
