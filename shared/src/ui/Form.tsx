import type { ComponentProps, ReactNode } from 'react';
import { cx } from './cx';

const control =
  'w-full rounded-md border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-faint ' +
  'transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60';

export function Input({ className, ...rest }: ComponentProps<'input'>) {
  return <input className={cx(control, 'h-11', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cx(control, 'min-h-24 py-2', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<'select'>) {
  return (
    <select className={cx(control, 'h-11 appearance-none pr-8', className)} {...rest}>
      {children}
    </select>
  );
}

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
