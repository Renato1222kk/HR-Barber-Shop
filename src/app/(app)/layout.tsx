'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Misc';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-950">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
