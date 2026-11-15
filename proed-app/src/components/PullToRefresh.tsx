import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown } from 'lucide-react';
import { Spinner } from '@proed/shared/ui';
import { useT } from '../lib/i18n';

const THRESHOLD = 64;

/** Pull down at the top of the page to refresh. Works with touch, on the window scroll. */
export function PullToRefresh({ onRefresh, refreshing, children }: { onRefresh: () => void; refreshing: boolean; children: ReactNode }) {
  const { t } = useT();
  const [pull, setPull] = useState(0);
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      pullRef.current = Math.min(dy * 0.5, 96);
      setPull(pullRef.current);
    };
    const onEnd = () => {
      if (pullRef.current >= THRESHOLD) onRefresh();
      start.current = null;
      pullRef.current = 0;
      setPull(0);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [onRefresh]);

  const height = refreshing ? 48 : pull;
  return (
    <>
      <div
        aria-hidden={!refreshing && pull === 0}
        className="flex items-end justify-center overflow-hidden text-xs text-muted"
        style={{ height, transition: start.current === null ? 'height 150ms ease-out' : undefined }}
      >
        <span className="flex items-center gap-2 pb-3">
          {refreshing ? (
            <>
              <Spinner size={14} /> {t('hw.refreshing')}
            </>
          ) : (
            <>
              <ArrowDown size={14} style={{ transform: pull >= THRESHOLD ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} />
              {pull >= THRESHOLD ? t('hw.release') : t('hw.pull')}
            </>
          )}
        </span>
      </div>
      {children}
    </>
  );
}
