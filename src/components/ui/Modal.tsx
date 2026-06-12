'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
  /**
   * Quando true, no mobile o modal vira uma tela cheia (sheet) com header e
   * footer fixos e corpo rolavel. No desktop continua como modal central.
   */
  fullScreenOnMobile?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  fullScreenOnMobile = false,
}: ModalProps) {
  // Garante que o portal so renderize no cliente (evita mismatch de hidratacao).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center',
        fullScreenOnMobile ? 'items-stretch sm:items-center' : 'items-end sm:items-center'
      )}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 flex w-full flex-col overflow-hidden bg-ink-850 shadow-soft animate-scale-in',
          // Forma no mobile
          fullScreenOnMobile
            ? 'h-[100dvh] max-h-[100dvh] rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-ink-700'
            : 'max-h-[92vh] rounded-t-2xl border border-ink-700 sm:max-h-[90vh] sm:rounded-2xl',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md'
        )}
      >
        {title && (
          <div
            className={cn(
              'flex shrink-0 items-center justify-between border-b border-ink-700 px-5 py-4',
              fullScreenOnMobile && 'pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4'
            )}
          >
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="-mr-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-ink-700 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div
          className={cn(
            'overflow-y-auto overscroll-contain px-5 pt-5',
            // Sem footer, garante respiro / safe area na base no mobile.
            footer ? 'pb-5' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
            fullScreenOnMobile && 'min-h-0 flex-1'
          )}
        >
          {children}
        </div>

        {footer && (
          <div
            className={cn(
              'flex shrink-0 gap-3 border-t border-ink-700 bg-ink-850 px-5 py-4',
              'pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4'
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
