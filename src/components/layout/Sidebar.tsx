'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { NAV_ITEMS } from './nav';
import { useAuth } from '@/lib/auth/AuthProvider';

export function Sidebar() {
  const pathname = usePathname();
  const { signOut, isDemo } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-800 bg-ink-900 lg:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-ink-950">
          <Scissors className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Bruno Samad</p>
          <p className="text-xs text-gold">Agenda</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-gold/10 text-gold'
                  : 'text-zinc-400 hover:bg-ink-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-800 p-3">
        {isDemo && (
          <p className="mb-2 rounded-lg bg-gold/10 px-3 py-2 text-[11px] leading-snug text-gold">
            Modo demonstracao. Configure o Supabase para usar dados reais.
          </p>
        )}
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-ink-800 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
