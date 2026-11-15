import { cx } from './cx';

/** The ProEd mark: a "P" with a short underline, on a deep blue square. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="14" fill="#1D378C" />
      <path
        d="M22 46V18h12.5a9.5 9.5 0 0 1 0 19H22"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M39 46h6" stroke="#93ACF2" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

/** Text logo with optional mark. */
export function Logo({ size = 'md', mark = true, suffix, className }: { size?: 'sm' | 'md' | 'lg'; mark?: boolean; suffix?: string; className?: string }) {
  const markSize = size === 'lg' ? 40 : size === 'sm' ? 24 : 32;
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl';
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      {mark ? <LogoMark size={markSize} /> : null}
      <span className={cx('font-semibold tracking-tight text-fg', text)}>
        Pro<span className="text-accent-text">Ed</span>
        {suffix ? <span className="ml-1.5 font-normal text-muted">{suffix}</span> : null}
      </span>
    </span>
  );
}
