'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { NAV_ITEMS } from './nav';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Logo } from '@/components/brand/Logo';
import { BRAND } from '@/lib/constants';

interface SidebarProps {
  /** Controla o menu recolhivel no mobile. No desktop a sidebar e sempre fixa. */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();

  // Fecha o menu ao trocar de rota no mobile.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <>
      {/* Overlay do menu recolhivel (apenas mobile/tablet) */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          'fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-ink-200 bg-white transition-transform duration-200 lg:z-30 lg:w-64 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-5">
          <Link
            href="/agenda"
            aria-label={BRAND.name}
            className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900/20"
          >
            {/* Versao compacta: monograma + nome, legivel na largura da sidebar. */}
            <Logo size="sm" />
          </Link>
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 hover:text-ink-900 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-ink-100 text-ink-900'
                    : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                )}
              >
                {/* Filete preto discreto marcando o item atual. */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-ink-950"
                  />
                )}
                <Icon
                  className={cn('h-5 w-5', active ? 'text-ink-900' : 'text-ink-500')}
                  strokeWidth={active ? 2.3 : 2}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-ink-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {user && (
            <p className="truncate px-3 pb-1 text-[11px] text-ink-500" title={user.email}>
              {user.email}
            </p>
          )}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink-700 shadow-sm transition-colors hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
