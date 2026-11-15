import { cx } from './cx';

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx('inline-block shrink-0 rounded-full border-2 border-current border-r-transparent', className)}
      style={{ width: size, height: size, animation: 'pe-spin 0.7s linear infinite' }}
    />
  );
}
