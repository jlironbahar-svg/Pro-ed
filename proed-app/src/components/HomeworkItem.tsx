import { useState } from 'react';
import { Check, ExternalLink, Paperclip, Pause, Pencil, Play } from 'lucide-react';
import { Badge, Button, cx } from '@proed/shared/ui';
import { useT } from '../lib/i18n';
import { useStore } from '../lib/store';
import { useNow } from '../lib/useNow';
import { formatClock, formatDuration } from '../lib/format';
import { useFlag } from '../access/flags';
import { detectKind, autoEstimate } from '../homework/estimate';
import type { Homework } from '../homework/model';
import { estimateFor, homeworkStore, isDone, setEstimate, startTimer, stopTimer, toggleDone } from '../homework/store';
import { EstimateSheet } from './EstimateSheet';

export function HomeworkItem({ hw, order, dueLabel }: { hw: Homework; order?: number; dueLabel?: string }) {
  const { t } = useT();
  const state = useStore(homeworkStore);
  const timerEnabled = useFlag('timer');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const local = state.local[hw.id] ?? {};
  const done = isDone(hw, state.local);
  const running = !!local.timerStart;
  const now = useNow(1000, running);
  const spent = (local.spentMs ?? 0) + (running ? now - (local.timerStart ?? now) : 0);
  const estimate = estimateFor(hw, state);
  const kind = detectKind(hw.description);

  return (
    <article className={cx('flex gap-3 px-4 py-3', done && 'opacity-60')}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? t('hw.markUndone') : t('hw.markDone')}
        onClick={() => toggleDone(hw)}
        className={cx(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
          done ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong hover:border-accent',
        )}
      >
        {done ? <Check size={14} strokeWidth={3} /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <button type="button" className="block w-full text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <div className="flex items-baseline gap-3">
            <h3 className={cx('min-w-0 flex-1 truncate text-sm font-semibold', done && 'line-through')}>
              {order !== undefined ? <span className="mr-2 text-faint tabular">{order}.</span> : null}
              {hw.subject}
            </h3>
            <span className="shrink-0 text-xs text-muted tabular">{t('hw.about', { d: formatDuration(estimate) })}</span>
          </div>
          {hw.description ? (
            <p className={cx('mt-1 text-sm whitespace-pre-line text-muted', !open && 'line-clamp-2')}>{hw.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {dueLabel ? <Badge tone="accent">{dueLabel}</Badge> : null}
            <Badge>{t(`hw.kind.${kind}`)}</Badge>
            {local.estimate !== undefined ? <Badge>{t('hw.edited')}</Badge> : null}
            {hw.attachments.length > 0 && !open ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Paperclip size={12} /> {hw.attachments.length}
              </span>
            ) : null}
            {running ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-text tabular">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {formatClock(spent)}
              </span>
            ) : null}
          </div>
        </button>

        {open ? (
          <div className="mt-3 flex flex-col gap-3">
            {hw.attachments.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {hw.attachments.map((a) => (
                  <li key={a.url}>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-2 text-sm text-accent-text hover:underline"
                    >
                      {a.kind === 'link' ? <ExternalLink size={14} className="shrink-0" /> : <Paperclip size={14} className="shrink-0" />}
                      <span className="truncate">{a.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {timerEnabled && !done ? (
                running ? (
                  <Button size="sm" variant="primary" icon={<Pause size={14} />} onClick={() => stopTimer(hw)}>
                    {t('hw.timerStop')} · <span className="tabular">{formatClock(spent)}</span>
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" icon={<Play size={14} />} onClick={() => startTimer(hw)}>
                    {t('hw.timerStart')}
                  </Button>
                )
              ) : null}
              <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => setEditing(true)}>
                {t('hw.editEstimate')}
              </Button>
            </div>
            {spent >= 60_000 && !running ? (
              <p className="text-xs text-muted tabular">{t('hw.spent', { d: formatDuration(spent / 60_000) })}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <EstimateSheet
        open={editing}
        onClose={() => setEditing(false)}
        subject={hw.subject}
        current={estimate}
        auto={autoEstimate(hw, state.samples)}
        edited={local.estimate !== undefined}
        onSave={(m) => setEstimate(hw.id, m)}
      />
    </article>
  );
}
