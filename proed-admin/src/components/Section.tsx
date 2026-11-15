import type { ReactNode } from 'react';
import { Card, SectionLabel } from '@proed/shared/ui';

export function Section({ title, hint, action, children, flush }: { title: string; hint?: string; action?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-4 px-1">
        <div>
          <SectionLabel>{title}</SectionLabel>
          {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        </div>
        {action}
      </div>
      <Card className={flush ? 'divide-y divide-line overflow-hidden' : 'p-4'}>{children}</Card>
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular">{value}</p>
    </div>
  );
}

export function Row({ primary, secondary, right }: { primary: ReactNode; secondary?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{primary}</p>
        {secondary ? <p className="truncate text-xs text-muted">{secondary}</p> : null}
      </div>
      {right ? <div className="shrink-0 text-right text-xs text-muted tabular">{right}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-muted">{children}</p>;
}
