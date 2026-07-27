'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// text-base (16px) no mobile evita o zoom automatico do iOS ao focar inputs.
const base =
  'w-full rounded-xl border border-ink-200 bg-white px-3.5 text-base text-ink-900 placeholder:text-ink-400 shadow-sm transition-colors focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/10 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:opacity-70 sm:text-sm';

// Alturas confortaveis para toque no mobile.
const controlHeight = 'h-12 sm:h-11';

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-ink-700">
      {children}
    </label>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      {children}
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, controlHeight, className)} {...props} />
  )
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, 'min-h-[88px] py-3', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(base, controlHeight, 'appearance-none pr-10', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
    </div>
  )
);
Select.displayName = 'Select';
