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
          'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-600 transition-colors hover:bg-green-100 hover:text-green-700',
          className
        )}
      >
        <MessageCircle className="h-[18px] w-[18px]" />
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
        'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-green-700',
        className
      )}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </a>
  );
}
