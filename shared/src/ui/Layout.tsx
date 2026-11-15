import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from './cx';
import { IconButton } from './Button';

export function TopBar({
  title,
  subtitle,
  left,
  right,
  below,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  /** Rendered under the bar, inside the sticky header (status banners). */
  below?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx('safe-top sticky top-0 z-20 border-b border-line bg-bg', className)}>
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
        {left}
        <div className="min-w-0 flex-1">
          {title ? <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1> : null}
          {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
        </div>
        {right ? <div className="flex items-center gap-1">{right}</div> : null}
      </div>
      {below}
    </header>
  );
}

/** Full-height centered layout for login, lock and info screens. */
export function CenterScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col bg-bg">
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">{children}</main>
      {footer ? <footer className="mx-auto w-full max-w-sm px-6 pb-6 text-center text-xs text-faint">{footer}</footer> : null}
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  closeLabel = 'Close',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeLabel?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label={closeLabel} className="absolute inset-0 cursor-default bg-black/40" onClick={onClose} />
      <div className="safe-bottom relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-xl border border-line bg-surface sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <IconButton label={closeLabel} size="sm" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
