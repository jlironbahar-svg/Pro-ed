import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button, Card, Logo, Segmented, useStore } from '@proed/shared/ui';
import { useT } from '../lib/i18n';
import { settingsStore, updateSettings, type Theme } from '../lib/settings';
import { isGithubMode, logout } from '../lib/api';

export function SettingsScreen() {
  const { t } = useT();
  const settings = useStore(settingsStore);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <Card className="divide-y divide-line">
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">{t('settings.language')}</span>
          <Segmented
            label={t('settings.language')}
            value={settings.lang}
            onChange={(lang) => updateSettings({ lang })}
            options={[
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">{t('settings.theme')}</span>
          <Segmented<Theme>
            label={t('settings.theme')}
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: 'system', label: t('settings.theme.system') },
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-medium">{isGithubMode() ? t('settings.repo') : t('settings.server')}</span>
          <span className="truncate font-mono text-xs text-muted">{isGithubMode() ? settings.githubRepo : settings.serverUrl || location.origin}</span>
        </div>
      </Card>
      <div>
        <Button
          variant="danger"
          icon={<LogOut size={16} />}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await logout();
          }}
        >
          {t('settings.logout')}
        </Button>
        <p className="mt-2 text-xs text-muted">{isGithubMode() ? t('settings.logoutLocal') : t('settings.logoutAll')}</p>
      </div>
      <footer className="mt-4 flex flex-col items-center gap-2 text-xs text-faint">
        <Logo size="sm" suffix="Admin" />
        <span className="tabular">{t('settings.version', { v: __APP_VERSION__ })}</span>
      </footer>
    </div>
  );
}
