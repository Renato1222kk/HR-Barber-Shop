'use client';

import { usePathname } from 'next/navigation';
import { Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/brand/Logo';
import { BRAND } from '@/lib/constants';
import { NAV_ITEMS } from './nav';

const TITLES: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((i) => [i.href, i.label])
);

interface HeaderProps {
  onNew: () => void;
  onOpenMenu: () => void;
}

export function Header({ onNew, onOpenMenu }: HeaderProps) {
  const pathname = usePathname();
  const title =
    TITLES[pathname] || NAV_ITEMS.find((i) => pathname.startsWith(i.href))?.label || BRAND.name;

  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onOpenMenu}
            aria-label="Abrir menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink-200 text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* No mobile a sidebar fica escondida: a marca aparece aqui. */}
          <LogoMark size="sm" className="lg:hidden" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-ink-900">{title}</h1>
            <p className="hidden truncate text-xs text-ink-500 sm:block">{BRAND.name}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button onClick={onNew} className="hidden sm:inline-flex">
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">Novo agendamento</span>
            <span className="lg:hidden">Novo</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
