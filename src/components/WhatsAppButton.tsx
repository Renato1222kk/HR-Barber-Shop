'use client';

import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { whatsappLink } from '@/lib/utils/whatsapp';

interface WhatsAppButtonProps {
  number: string;
  message: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}

export function WhatsAppButton({
  number,
  message,
  label = 'WhatsApp',
  className,
  iconOnly,
}: WhatsAppButtonProps) {
  if (!number) return null;

  if (iconOnly) {
    return (
      <a
        href={whatsappLink(number, message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Enviar WhatsApp"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/15 text-green-400 transition-colors hover:bg-green-500/25',
          className
        )}
      >
        <MessageCircle className="h-4.5 w-4.5" />
      </a>
    );
  }

  return (
    <a
      href={whatsappLink(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-500/90 px-4 text-sm font-semibold text-white transition-colors hover:bg-green-500',
        className
      )}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </a>
  );
}
