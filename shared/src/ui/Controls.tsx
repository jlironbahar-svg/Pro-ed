import { cx } from './cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('inline-flex rounded-md border border-line bg-subtle p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'h-8 flex-1 rounded-[5px] px-3 text-sm font-medium transition-colors',
              active ? 'bg-surface text-fg shadow-[0_1px_0_0_var(--pe-line)]' : 'text-muted hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50',
        checked ? 'border-accent bg-accent' : 'border-line-strong bg-subtle',
      )}
    >
      <span
        className={cx(
          'inline-block h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-[19px]' : 'translate-x-[3px]',
          !checked && 'bg-faint',
        )}
      />
    </button>
  );
}
