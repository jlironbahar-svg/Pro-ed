import { useState, type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { Button, Card, Logo, SectionLabel, Segmented, Sheet, TopBar } from '@proed/shared/ui';
import { useT } from '../lib/i18n';
import { useStore } from '../lib/store';
import { settingsStore, updateSettings, type Theme } from '../lib/settings';
import { sessionStore } from '../lib/session';
import { APP_VERSION } from '../lib/platform';
import { logout } from '../pronote/client';
import { clearHomework } from '../homework/store';
import { useBanner } from '../components/BannerContext';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

export async function signOut(): Promise<void> {
  await logout();
  await clearHomework();
  sessionStore.set(null);
}

export function SettingsScreen() {
  const { t } = useT();
  const settings = useStore(settingsStore);
  const session = useStore(sessionStore);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const banner = useBanner();

  return (
    <>
      <TopBar title={t('settings.title')} below={banner} />
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-4 pb-8">
        <Card className="divide-y divide-line">
          <Row label={t('settings.language')}>
            <Segmented
              label={t('settings.language')}
              value={settings.lang}
              onChange={(lang) => updateSettings({ lang })}
              options={[
                { value: 'fr', label: 'Français' },
                { value: 'en', label: 'English' },
              ]}
              className="w-full sm:w-auto"
            />
          </Row>
          <Row label={t('settings.theme')}>
            <Segmented<Theme>
              label={t('settings.theme')}
              value={settings.theme}
              onChange={(theme) => updateSettings({ theme })}
              options={[
                { value: 'system', label: t('settings.theme.system') },
                { value: 'light', label: t('settings.theme.light') },
                { value: 'dark', label: t('settings.theme.dark') },
              ]}
              className="w-full sm:w-auto"
            />
          </Row>
        </Card>

        {session ? (
          <section>
            <SectionLabel className="mb-2 px-1">{t('settings.account')}</SectionLabel>
            <Card className="px-4 py-3">
              <p className="text-sm font-medium">{t('settings.signedInAs', { name: session.studentName })}</p>
              {session.schoolName ? <p className="mt-0.5 text-sm text-muted">{session.schoolName}</p> : null}
              <Button variant="danger" className="mt-4" icon={<LogOut size={16} />} onClick={() => setConfirm(true)}>
                {t('settings.logout')}
              </Button>
            </Card>
          </section>
        ) : null}

        <section>
          <SectionLabel className="mb-2 px-1">{t('settings.data')}</SectionLabel>
          <p className="px-1 text-sm text-muted">{t('settings.dataHint')}</p>
        </section>

        <footer className="mt-4 flex flex-col items-center gap-2 text-xs text-faint">
          <Logo size="sm" />
          <span className="tabular">{t('settings.version', { v: APP_VERSION })}</span>
        </footer>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title={t('settings.logout')} closeLabel={t('settings.cancel')}>
        <p className="text-sm text-muted">{t('settings.logoutConfirm')}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button
            variant="danger"
            block
            size="lg"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await signOut();
              setBusy(false);
              setConfirm(false);
            }}
          >
            {t('settings.logout')}
          </Button>
          <Button variant="ghost" block onClick={() => setConfirm(false)}>
            {t('settings.cancel')}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
