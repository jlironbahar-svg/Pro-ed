import type { ReactNode } from 'react';
import { cx } from '@proed/shared/ui';

export interface Tab<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
}

export function TabBar<T extends string>({ tabs, active, onChange }: { tabs: Tab<T>[]; active: T; onChange: (id: T) => void }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-2xl">
        {tabs.map((tab) => {
          const on = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={on ? 'page' : undefined}
              className={cx(
                'flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                on ? 'text-accent-text' : 'text-faint hover:text-muted',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
