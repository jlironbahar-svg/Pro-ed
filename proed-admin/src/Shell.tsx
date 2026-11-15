import { useEffect, useState } from 'react';
import { Activity, FlaskConical, ScrollText, Settings, SlidersHorizontal, Users } from 'lucide-react';
import { IconButton, LogoMark, TopBar, cx } from '@proed/shared/ui';
import { useT, type TKey } from './lib/i18n';
import { DashboardScreen } from './screens/DashboardScreen';
import { UsersScreen } from './screens/UsersScreen';
import { BetaScreen } from './screens/BetaScreen';
import { SystemScreen } from './screens/SystemScreen';
import { AuditScreen } from './screens/AuditScreen';
import { SettingsScreen } from './screens/SettingsScreen';

type Page = 'dashboard' | 'users' | 'beta' | 'system' | 'audit' | 'settings';

const NAV: { id: Exclude<Page, 'settings'>; label: TKey; icon: typeof Activity }[] = [
  { id: 'dashboard', label: 'nav.dashboard', icon: Activity },
  { id: 'users', label: 'nav.users', icon: Users },
  { id: 'beta', label: 'nav.beta', icon: FlaskConical },
  { id: 'system', label: 'nav.system', icon: SlidersHorizontal },
  { id: 'audit', label: 'nav.audit', icon: ScrollText },
];

export function Shell() {
  const { t } = useT();
  const [page, setPage] = useState<Page>('dashboard');
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <div className="min-h-dvh bg-bg pb-[calc(56px+env(safe-area-inset-bottom))]">
      <TopBar
        left={<LogoMark size={28} />}
        title={t(page === 'settings' ? 'nav.settings' : NAV.find((n) => n.id === page)!.label)}
        subtitle="ProEd Admin"
        right={
          <IconButton label={t('nav.settings')} onClick={() => setPage('settings')} className={page === 'settings' ? 'text-accent-text' : undefined}>
            <Settings size={18} />
          </IconButton>
        }
      />
      <main className="mx-auto max-w-3xl px-4 py-4">
        {page === 'dashboard' && <DashboardScreen />}
        {page === 'users' && <UsersScreen />}
        {page === 'beta' && <BetaScreen />}
        {page === 'system' && <SystemScreen />}
        {page === 'audit' && <AuditScreen />}
        {page === 'settings' && <SettingsScreen />}
      </main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-3xl">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPage(id)}
              aria-current={page === id ? 'page' : undefined}
              className={cx(
                'flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                page === id ? 'text-accent-text' : 'text-faint hover:text-muted',
              )}
            >
              <Icon size={20} />
              {t(label)}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
