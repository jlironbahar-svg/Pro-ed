import type { ComponentProps, ReactNode } from 'react';
import { cx } from './cx';

/** Bordered panel. Flat by design: a border, no heavy shadow. */
export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cx('rounded-lg border border-line bg-surface', className)} {...rest} />;
}

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const badgeTones: Record<Tone, string> = {
  neutral: 'bg-subtle text-muted',
  accent: 'bg-accent-soft text-accent-text',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({ tone = 'neutral', className, ...rest }: ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      className={cx('inline-flex h-6 items-center rounded-sm px-2 text-xs font-medium whitespace-nowrap', badgeTones[tone], className)}
      {...rest}
    />
  );
}

const bannerTones = {
  info: 'border-accent/25 bg-accent-soft text-fg',
  warning: 'border-warning/30 bg-warning-soft text-fg',
  danger: 'border-danger/30 bg-danger-soft text-fg',
} as const;

export interface BannerProps {
  tone?: keyof typeof bannerTones;
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Banner({ tone = 'info', title, icon, action, children, className }: BannerProps) {
  return (
    <div role="status" className={cx('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', bannerTones[tone], className)}>
      {icon ? <span className="mt-0.5 shrink-0 text-muted">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cx(title ? 'mt-0.5' : '', 'text-muted')}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionLabel({ className, ...rest }: ComponentProps<'h2'>) {
  return <h2 className={cx('text-xs font-semibold tracking-wide text-faint uppercase', className)} {...rest} />;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <p className="text-base font-medium text-fg">{title}</p>
      {children ? <p className="mt-1 max-w-xs text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cx('border-0 border-t border-line', className)} />;
}
