'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  // Preto de destaque com texto branco — a acao principal do tema claro.
  primary:
    'bg-ink-950 text-white font-semibold hover:bg-ink-800 active:bg-ink-900 shadow-card disabled:opacity-40',
  secondary:
    'border border-ink-200 bg-white text-ink-900 hover:bg-ink-100 active:bg-ink-200 disabled:opacity-40',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-40',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-40',
  outline:
    'border border-ink-200 bg-white text-ink-700 hover:bg-ink-100 hover:border-ink-300 disabled:opacity-40',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg',
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
  icon: 'h-10 w-10 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white select-none disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
