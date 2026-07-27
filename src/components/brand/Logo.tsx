import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { BRAND } from '@/lib/constants';

/**
 * Marca da HR Barber Shop.
 *
 * A arte oficial (`/hr-barber-shop-logo.jpeg`) é quadrada, tem fundo claro e
 * traço escuro — combina direto com o tema branco, sem precisar de cartão
 * escuro por trás. A imagem usa `object-contain` dentro de um quadro quadrado:
 * nunca é esticada nem cortada.
 */

type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

/** Lado do quadro em pixels — a arte original é quadrada (1254x1254). */
const BOX_PX: Record<LogoSize, number> = {
  sm: 36,
  md: 44,
  lg: 96,
  xl: 132,
};

const boxClass: Record<LogoSize, string> = {
  sm: 'h-9 w-9 rounded-lg',
  md: 'h-11 w-11 rounded-xl',
  lg: 'h-24 w-24 rounded-2xl',
  xl: 'h-[132px] w-[132px] rounded-3xl',
};

const titleSize: Record<LogoSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

const taglineSize: Record<LogoSize, string> = {
  sm: 'text-[10px]',
  md: 'text-[11px]',
  lg: 'text-xs',
  xl: 'text-sm',
};

interface LogoMarkProps {
  size?: LogoSize;
  className?: string;
  /** Carrega com prioridade (use na tela de login, que é a primeira vista). */
  priority?: boolean;
}

/**
 * Só a arte — é também a versão "monograma" usada quando não há espaço para o
 * nome por extenso (cabeçalho mobile, menu recolhido).
 */
export function LogoMark({ size = 'md', className, priority = false }: LogoMarkProps) {
  const px = BOX_PX[size];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ring-1 ring-ink-900/10',
        boxClass[size],
        className
      )}
    >
      <Image
        src={BRAND.logo}
        alt={BRAND.name}
        width={px * 2}
        height={px * 2}
        sizes={`${px}px`}
        priority={priority}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

interface LogoProps extends LogoMarkProps {
  showMark?: boolean;
}

/** Marca completa: arte + "HR / Barber Shop". Usada no menu lateral. */
export function Logo({ size = 'md', className, showMark = true, priority }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      {showMark && <LogoMark size={size} priority={priority} />}
      <span className="flex flex-col leading-none">
        <span className={cn('font-semibold tracking-tight text-ink-900', titleSize[size])}>
          {BRAND.initials}
        </span>
        <span
          className={cn(
            'mt-1 font-medium uppercase tracking-[0.28em] text-ink-500',
            taglineSize[size]
          )}
        >
          {BRAND.tagline}
        </span>
      </span>
    </span>
  );
}
