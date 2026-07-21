import { cn } from '@/lib/utils/cn';
import { BRAND } from '@/lib/constants';

type LogoSize = 'sm' | 'md' | 'lg';

const markSize: Record<LogoSize, string> = {
  sm: 'h-9 w-9 text-[13px] rounded-lg',
  md: 'h-10 w-10 text-sm rounded-xl',
  lg: 'h-16 w-16 text-2xl rounded-2xl',
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

/** Monograma "HR" — quadrado dourado com as iniciais. */
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
        markSize[size],
        className
      )}
    >
      {BRAND.initials}
    </span>
  );
}

/** Marca tipografica completa: monograma + "HR / Barber Shop". */
export function Logo({
  size = 'md',
  className,
  showMark = true,
}: {
  size?: LogoSize;
  className?: string;
  showMark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      {showMark && <LogoMark size={size} />}
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
    </span>
  );
}
