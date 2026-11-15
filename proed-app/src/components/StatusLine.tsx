import { CloudOff } from 'lucide-react';
import { Banner } from '@proed/shared/ui';
import { useT } from '../lib/i18n';
import { useStore } from '../lib/store';
import { useNow } from '../lib/useNow';
import { formatAgo } from '../lib/format';
import { homeworkStore } from '../homework/store';

/** Shows when the list comes from the cache because the refresh failed. */
export function RefreshBanner() {
  const { t, lang } = useT();
  const { error, fetchedAt } = useStore(homeworkStore);
  const now = useNow(30_000);
  if (!error) return null;
  const offline = error === 'error.network';
  return (
    <Banner tone={offline ? 'info' : 'warning'} icon={<CloudOff size={16} />} className="mb-4">
      {offline && fetchedAt ? t('hw.offline', { time: formatAgo(fetchedAt, now, lang) }) : t(error === 'error.sessionExpired' ? error : 'hw.refreshError')}
    </Banner>
  );
}

export function useUpdatedLabel(): string | undefined {
  const { t, lang } = useT();
  const { fetchedAt, loading } = useStore(homeworkStore);
  const now = useNow(30_000);
  if (loading) return t('hw.refreshing');
  return fetchedAt ? t('hw.updated', { time: formatAgo(fetchedAt, now, lang) }) : undefined;
}
