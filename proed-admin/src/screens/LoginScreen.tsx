import { useState, type FormEvent } from 'react';
import { Banner, Button, CenterScreen, Field, Input, Logo } from '@proed/shared/ui';
import { useStore } from '@proed/shared/ui';
import { useT, type TKey } from '../lib/i18n';
import { settingsStore, updateSettings } from '../lib/settings';
import { ApiError, login } from '../lib/api';

export function LoginScreen() {
  const { t } = useT();
  const settings = useStore(settingsStore);
  const [server, setServer] = useState(settings.serverUrl);
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TKey | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    updateSettings({ serverUrl: server.trim().replace(/\/$/, '') });
    try {
      await login(password, totp);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 429 ? 'login.rateLimited' : status === 0 ? 'login.unreachable' : 'login.invalid');
      setTotp('');
      setBusy(false);
    }
  };

  return (
    <CenterScreen footer={t('settings.version', { v: __APP_VERSION__ })}>
      <Logo size="lg" suffix="Admin" />
      <h1 className="mt-10 text-2xl font-semibold tracking-tight">{t('login.title')}</h1>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <Field label={t('login.server')} htmlFor="server">
          <Input
            id="server"
            value={server}
            onChange={(e) => setServer(e.target.value)}
            placeholder="https://proed.example.com"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="text-sm"
          />
        </Field>
        <Field label={t('login.password')} htmlFor="password">
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Field label={t('login.totp')} htmlFor="totp" hint={t('login.totpHint')}>
          <Input
            id="totp"
            value={totp}
            onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="text-center text-lg tracking-[0.4em] tabular"
            required
          />
        </Field>
        {error ? <Banner tone="danger">{t(error)}</Banner> : null}
        <Button type="submit" size="lg" block loading={busy} disabled={!password || totp.length !== 6}>
          {t('login.submit')}
        </Button>
      </form>
    </CenterScreen>
  );
}
