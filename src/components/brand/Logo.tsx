'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { BRAND } from '@/lib/constants';

// Logo oficial da HR Barber Shop (arquivo local em /public).
export const LOGO_SRC = '/hr-barber-shop-logo.jpeg';

type LogoSize = 'sm' | 'md' | 'lg';

const boxSize: Record<LogoSize, string> = {
  sm: 'h-10 w-10 rounded-lg',
  md: 'h-12 w-12 rounded-xl',
  lg: 'h-28 w-28 rounded-2xl',
};

const markTextSize: Record<LogoSize, string> = {
  sm: 'text-[13px]',
  md: 'text-sm',
  lg: 'text-3xl',
};

const titleSize: Record<LogoSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
};

const taglineSize: Record<LogoSize, string> = {
  sm: 'text-[10px]',
  md: 'text-[11px]',
  lg: 'text-xs',
};

/** Monograma "HR" — usado como acento e como fallback caso a imagem falhe. */
export function LogoMark({
  size = 'md',
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-gold-200 via-gold to-gold-700 font-bold tracking-tight text-ink-950 shadow-gold',
        boxSize[size],
        markTextSize[size],
        className
      )}
    >
      {BRAND.initials}
    </span>
  );
}

/**
 * Logo em imagem, com proporção preservada (object-contain) e, sobre fundos
 * escuros, um card branco discreto para garantir a leitura das letras "HR".
 */
export function LogoImage({
  size = 'md',
  className,
  card = true,
  priority = false,
}: {
  size?: LogoSize;
  className?: string;
  card?: boolean;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <LogoMark size={size} className={className} />;

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden',
        boxSize[size],
        card ? 'bg-white p-1.5 shadow-soft ring-1 ring-black/5' : 'p-0',
        className
      )}
    >
      <Image
        src={LOGO_SRC}
        alt={BRAND.name}
        fill
        sizes="(max-width: 768px) 25vw, 160px"
        priority={priority}
        className="object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

/** Marca completa: logo (card branco) + wordmark "HR Barber Shop". */
export function Logo({
  size = 'md',
  className,
  showText = true,
}: {
  size?: LogoSize;
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoImage size={size} />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className={cn('font-semibold tracking-tight text-white', titleSize[size])}>
            {BRAND.initials}
          </span>
          <span
            className={cn(
              'mt-1 font-medium uppercase tracking-[0.28em] text-gold',
              taglineSize[size]
            )}
          >
            {BRAND.tagline}
          </span>
        </span>
      )}
    </span>
  );
}
