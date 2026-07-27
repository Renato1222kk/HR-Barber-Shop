'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils/cn';
import { MORE_NAV } from './nav';

export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <Modal open={open} onClose={onClose} title="Mais">
      <div className="space-y-2.5">
        {MORE_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <button
              key={item.href}
              onClick={() => go(item.href)}
              className={cn(
                'flex w-full items-center gap-3.5 rounded-xl border bg-white px-4 py-3.5 text-left transition-colors',
                active
                  ? 'border-ink-300 bg-ink-50'
                  : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50'
              )}
            >
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  active ? 'bg-ink-950 text-white' : 'bg-ink-100 text-ink-600'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">
                  {item.label}
                </p>
                {item.description && (
                  <p className="truncate text-xs text-ink-500">{item.description}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
