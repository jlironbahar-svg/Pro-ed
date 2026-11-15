import { useEffect, useState, type ReactNode } from 'react';
import { CalendarCheck, ListChecks, Settings } from 'lucide-react';
import { useT } from './lib/i18n';
import { useFlag } from './access/flags';
import { homeworkStore, refreshHomework } from './homework/store';
import { TabBar, type Tab } from './components/TabBar';
import { TodayScreen } from './screens/TodayScreen';
import { HomeworkScreen } from './screens/HomeworkScreen';
import { SettingsScreen } from './screens/SettingsScreen';

type TabId = 'today' | 'homework' | 'settings';
const STALE_MS = 10 * 60_000;

/** Signed-in app: tabs, refresh on open and when coming back to the app. */
export function MainShell({ canRefresh, banner }: { canRefresh: boolean; banner?: ReactNode }) {
  const { t } = useT();
  const todayEnabled = useFlag('today_view');
  const [tab, setTab] = useState<TabId>(todayEnabled ? 'today' : 'homework');
  const current = !todayEnabled && tab === 'today' ? 'homework' : tab;

  useEffect(() => {
    if (!canRefresh) return;
    void refreshHomework();
    const onVisible = () => {
      const { fetchedAt } = homeworkStore.get();
      if (document.visibilityState === 'visible' && (!fetchedAt || Date.now() - fetchedAt > STALE_MS)) void refreshHomework();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [canRefresh]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [current]);

  const tabs: Tab<TabId>[] = [
    ...(todayEnabled ? [{ id: 'today' as const, label: t('tab.today'), icon: <CalendarCheck size={20} /> }] : []),
    { id: 'homework', label: t('tab.homework'), icon: <ListChecks size={20} /> },
    { id: 'settings', label: t('tab.settings'), icon: <Settings size={20} /> },
  ];

  return (
    <div className="min-h-dvh bg-bg pb-[calc(56px+env(safe-area-inset-bottom))]">
      {banner}
      {current === 'today' && <TodayScreen canRefresh={canRefresh} onSeeAll={() => setTab('homework')} />}
      {current === 'homework' && <HomeworkScreen canRefresh={canRefresh} />}
      {current === 'settings' && <SettingsScreen />}
      <TabBar tabs={tabs} active={current} onChange={setTab} />
    </div>
  );
}
