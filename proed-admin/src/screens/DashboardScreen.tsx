import { ADMIN_REFRESH_MS, type AccessEvent, type DashboardData } from '@proed/shared/core';
import { Banner, Spinner } from '@proed/shared/ui';
import { useT, type TKey } from '../lib/i18n';
import { api } from '../lib/api';
import { formatAgo, formatDateTime } from '../lib/format';
import { usePolling } from '../lib/usePolling';
import { DailyChart } from '../components/DailyChart';
import { Empty, Row, Section, Stat } from '../components/Section';

export function DashboardScreen() {
  const { t, lang } = useT();
  const { data, error } = usePolling(() => api<DashboardData>('/admin/dashboard'), ADMIN_REFRESH_MS);

  if (!data) {
    return error ? <Banner tone="danger">{t('common.error')}</Banner> : <div className="flex justify-center py-16 text-muted"><Spinner /></div>;
  }

  const eventRow = (e: AccessEvent) => (
    <Row
      key={e.id}
      primary={e.userLabel ?? e.code ?? '-'}
      secondary={[e.reason ? t(`reason.${e.reason}` as TKey) : null, e.deviceType ? t(`device.${e.deviceType}`) : null, e.appVersion]
        .filter(Boolean)
        .join(' · ')}
      right={formatDateTime(e.at, lang)}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {error ? <Banner tone="warning">{t('common.error')}</Banner> : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t('dash.online')} value={data.online.length} />
        <Stat label={t('dash.users')} value={data.totals.users} />
        <Stat label={t('dash.today')} value={data.totals.activeToday} />
        <Stat label={t('dash.week')} value={data.totals.activeWeek} />
      </div>

      <Section title={t('dash.chart')}>
        <DailyChart data={data.daily} />
      </Section>

      <Section title={t('dash.onlineNow')} hint={t('common.refreshing')} flush>
        {data.online.length === 0 ? (
          <Empty>{t('dash.nobodyOnline')}</Empty>
        ) : (
          data.online.map((o) => (
            <Row
              key={`${o.userId}-${o.lastSeen}-${o.deviceType}`}
              primary={o.label || o.code}
              secondary={`${t(`device.${o.deviceType}`)} · ${o.appVersion}${o.label ? ` · ${o.code}` : ''}`}
              right={
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {formatAgo(o.lastSeen, data.now, lang)}
                </span>
              }
            />
          ))
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t('dash.checks')} flush>
          {data.recentChecks.length === 0 ? <Empty>{t('dash.none')}</Empty> : data.recentChecks.slice(0, 10).map(eventRow)}
        </Section>
        <Section title={t('dash.denied')} flush>
          {data.recentDenied.length === 0 ? <Empty>{t('dash.none')}</Empty> : data.recentDenied.slice(0, 10).map(eventRow)}
        </Section>
      </div>
    </div>
  );
}
