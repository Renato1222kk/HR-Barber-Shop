'use client';

import { usePathname } from 'next/navigation';
import { Plus, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NAV_ITEMS } from './nav';

const TITLES: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((i) => [i.href, i.label])
);

export function Header({ onNew }: { onNew: () => void }) {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ||
    NAV_ITEMS.find((i) => pathname.startsWith(i.href))?.label ||
    'Bruno Samad Agenda';

  return (
    <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-900/90 backdrop-blur supports-[backdrop-filter]:bg-ink-900/70">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-ink-950 lg:hidden">
            <Scissors className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">{title}</h1>
            <p className="hidden text-xs text-zinc-500 sm:block">Bruno Samad Agenda</p>
          </div>
        </div>

        <Button onClick={onNew} className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" />
          Novo agendamento
        </Button>
      </div>
    </header>
  );
}
