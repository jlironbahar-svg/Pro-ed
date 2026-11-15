import { useState, type FormEvent } from 'react';
import { Banner, Button, CenterScreen, Field, Input, Logo } from '@proed/shared/ui';
import { useStore } from '@proed/shared/ui';
import { useT, type TKey } from '../lib/i18n';
import { settingsStore, updateSettings } from '../lib/settings';
import { ApiError, login, loginGithub } from '../lib/api';

export function LoginScreen() {
  const settings = useStore(settingsStore);
  return settings.mode === 'github' ? <GithubLogin /> : <ServerLogin />;
}

function ModeSwitch({ to }: { to: 'server' | 'github' }) {
  const { t } = useT();
  return (
    <button type="button" className="mt-6 text-sm text-accent-text hover:underline" onClick={() => updateSettings({ mode: to })}>
      {to === 'server' ? t('login.useServer') : t('login.useGithub')}
    </button>
  );
}

function GithubLogin() {
  const { t } = useT();
  const settings = useStore(settingsStore);
  const [repo, setRepo] = useState(settings.githubRepo);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TKey | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    updateSettings({ githubRepo: repo.trim() });
    try {
      await loginGithub(repo, token);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 401 ? 'login.githubInvalid' : status === 403 ? 'login.githubNoWrite' : status === 404 ? 'login.githubNotFound' : status === 0 ? 'login.unreachable' : 'common.error');
      setBusy(false);
    }
  };

  return (
    <CenterScreen footer={t('settings.version', { v: __APP_VERSION__ })}>
      <Logo size="lg" suffix="Admin" />
      <h1 className="mt-10 text-2xl font-semibold tracking-tight">{t('login.githubTitle')}</h1>
      <p className="mt-1 text-sm text-muted">{t('login.githubText')}</p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <Field label={t('login.githubRepo')} htmlFor="repo">
          <Input id="repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repository" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="font-mono text-sm" required />
        </Field>
        <Field label={t('login.githubToken')} htmlFor="token" hint={t('login.githubTokenHint')}>
          <Input id="token" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} className="font-mono text-sm" required />
        </Field>
        {error ? <Banner tone="danger">{t(error)}</Banner> : null}
        <Button type="submit" size="lg" block loading={busy} disabled={!repo.includes('/') || token.trim().length < 20}>
          {t('login.submit')}
        </Button>
      </form>
      <ModeSwitch to="server" />
    </CenterScreen>
  );
}

function ServerLogin() {
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
      {settings.githubRepo ? <ModeSwitch to="github" /> : null}
    </CenterScreen>
  );
}
