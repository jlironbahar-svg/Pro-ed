import { useMemo } from 'react';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { Card, IconButton, SectionLabel, Spinner, TopBar } from '@proed/shared/ui';
import { useT } from '../lib/i18n';
import { useStore } from '../lib/store';
import { useNow } from '../lib/useNow';
import { formatDay, formatDuration } from '../lib/format';
import { estimateFor, homeworkStore, isDone, refreshHomework } from '../homework/store';
import { planToday } from '../homework/today';
import { dueLabel } from '../homework/due';
import { HomeworkItem } from '../components/HomeworkItem';
import { PullToRefresh } from '../components/PullToRefresh';
import { RefreshBanner, useUpdatedLabel } from '../components/StatusLine';

export function TodayScreen({ canRefresh, onSeeAll }: { canRefresh: boolean; onSeeAll: () => void }) {
  const { t, lang } = useT();
  const state = useStore(homeworkStore);
  const now = useNow(60_000);
  const updated = useUpdatedLabel();

  const plan = useMemo(
    () => planToday(state.items, (h) => isDone(h, state.local), (h) => estimateFor(h, state), now),
    [state, now],
  );
  const count = plan.todo.length;

  const content = (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-8">
      <RefreshBanner />
      <p className="text-sm text-muted first-letter:uppercase">{formatDay(now, lang)}</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight tabular">
        {count === 0
          ? plan.done.length > 0
            ? t('today.allDone')
            : t('today.emptyTitle')
          : count === 1
            ? t('today.summaryOne', { d: formatDuration(plan.totalMinutes) })
            : t('today.summary', { n: count, d: formatDuration(plan.totalMinutes) })}
      </h2>

      {state.loading && state.items.length === 0 ? (
        <div className="flex justify-center py-16 text-muted">
          <Spinner />
        </div>
      ) : count === 0 && plan.done.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{t('today.emptyText')}</p>
      ) : null}

      {count > 0 ? (
        <section className="mt-8">
          <div className="mb-2 flex items-baseline justify-between gap-4 px-1">
            <SectionLabel>{t('today.order')}</SectionLabel>
            <span className="text-xs text-faint">{t('today.orderHint')}</span>
          </div>
          <Card className="divide-y divide-line">
            {plan.todo.map((h, i) => (
              <HomeworkItem key={h.id} hw={h} order={i + 1} dueLabel={dueLabel(h.due, now, t, lang)} />
            ))}
          </Card>
        </section>
      ) : null}

      {plan.done.length > 0 ? (
        <section className="mt-8">
          <SectionLabel className="mb-2 px-1">{t('today.doneCount', { n: plan.done.length })}</SectionLabel>
          <Card className="divide-y divide-line">
            {plan.done.map((h) => (
              <HomeworkItem key={h.id} hw={h} dueLabel={dueLabel(h.due, now, t, lang)} />
            ))}
          </Card>
        </section>
      ) : null}

      {plan.laterCount > 0 ? (
        <button
          type="button"
          onClick={onSeeAll}
          className="mt-8 flex w-full items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-left text-sm transition-colors hover:bg-subtle"
        >
          <span>
            <span className="block font-medium">{t('today.seeAll')}</span>
            <span className="block text-xs text-muted">
              {plan.laterCount === 1 ? t('today.laterOne') : t('today.later', { n: plan.laterCount })}
            </span>
          </span>
          <ChevronRight size={16} className="text-faint" />
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <TopBar
        title={t('today.title')}
        subtitle={updated}
        right={
          canRefresh ? (
            <IconButton label={t('hw.refresh')} onClick={() => refreshHomework()} disabled={state.loading}>
              <RefreshCw size={18} className={state.loading ? 'animate-spin' : undefined} />
            </IconButton>
          ) : null
        }
      />
      {canRefresh ? (
        <PullToRefresh onRefresh={refreshHomework} refreshing={state.loading && state.items.length > 0}>
          {content}
        </PullToRefresh>
      ) : (
        content
      )}
    </>
  );
}
