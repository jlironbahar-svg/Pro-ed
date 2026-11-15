import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, IconButton, SectionLabel, Spinner, TopBar } from '@proed/shared/ui';
import { useT } from '../lib/i18n';
import { useStore } from '../lib/store';
import { useNow } from '../lib/useNow';
import { startOfDay } from '../lib/format';
import { homeworkStore, isDone, refreshHomework, upcoming } from '../homework/store';
import { dueLabel } from '../homework/due';
import type { Homework } from '../homework/model';
import { HomeworkItem } from '../components/HomeworkItem';
import { PullToRefresh } from '../components/PullToRefresh';
import { RefreshBanner, useUpdatedLabel } from '../components/StatusLine';

export function HomeworkScreen({ canRefresh }: { canRefresh: boolean }) {
  const { t, lang } = useT();
  const state = useStore(homeworkStore);
  const now = useNow(60_000);
  const [showDone, setShowDone] = useState(false);
  const updated = useUpdatedLabel();

  const list = useMemo(() => upcoming(state.items, now), [state.items, now]);
  const doneCount = list.filter((h) => isDone(h, state.local)).length;
  const visible = showDone ? list : list.filter((h) => !isDone(h, state.local));

  const groups = useMemo(() => {
    const map = new Map<number, Homework[]>();
    for (const h of visible) {
      const day = startOfDay(h.due);
      map.set(day, [...(map.get(day) ?? []), h]);
    }
    return [...map.entries()];
  }, [visible]);

  const content = (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-8">
      <RefreshBanner />
      {state.loading && state.items.length === 0 ? (
        <div className="flex justify-center py-16 text-muted">
          <Spinner />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState title={t('hw.emptyTitle')}>{t('hw.emptyText')}</EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([day, items]) => (
            <section key={day}>
              <SectionLabel className="mb-2 px-1">{dueLabel(day, now, t, lang)}</SectionLabel>
              <Card className="divide-y divide-line">
                {items.map((h) => (
                  <HomeworkItem key={h.id} hw={h} />
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
      {doneCount > 0 ? (
        <div className="mt-6 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setShowDone((s) => !s)}>
            {showDone ? t('hw.hideDone') : t('hw.showDone', { n: doneCount })}
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <TopBar
        title={t('hw.title')}
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
