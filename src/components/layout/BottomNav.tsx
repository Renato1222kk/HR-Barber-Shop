'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { MOBILE_LEFT, MOBILE_RIGHT, MORE_NAV, type NavItem } from './nav';
import { MoreSheet } from './MoreSheet';

const tabClass =
  'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors';

export function BottomNav({ onNew }: { onNew: () => void }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const moreActive = MORE_NAV.some((i) => isActive(i.href));

  const renderItem = (item: NavItem) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(tabClass, active ? 'text-ink-900' : 'text-ink-500')}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="relative flex h-16 items-stretch px-2">
          {MOBILE_LEFT.map(renderItem)}

          {/* Botao central - Novo agendamento */}
          <div className="flex w-16 items-center justify-center">
            <button
              onClick={onNew}
              aria-label="Novo agendamento"
              className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-ink-950 text-white shadow-soft ring-4 ring-white transition-transform active:scale-95"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>

          {MOBILE_RIGHT.map(renderItem)}

          {/* Item "Mais" - abre bottom sheet */}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="Mais opções"
            aria-expanded={moreOpen}
            className={cn(tabClass, moreActive || moreOpen ? 'text-ink-900' : 'text-ink-500')}
          >
            <MoreHorizontal
              className="h-5 w-5"
              strokeWidth={moreActive || moreOpen ? 2.4 : 2}
            />
            Mais
          </button>
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
