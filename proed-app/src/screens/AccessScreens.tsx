import { useState, type FormEvent, type ReactNode } from 'react';
import { Download, RotateCw } from 'lucide-react';
import { Banner, Button, CenterScreen, Field, Input, Logo, Spinner } from '@proed/shared/ui';
import { useT, type TKey } from '../lib/i18n';
import { APP_VERSION, isNative } from '../lib/platform';
import { DEFAULT_GRACE_HOURS, type LatestApk } from '@proed/shared/core';
import { forgetInviteCode, runCheck } from '../access/controller';

function Footer() {
  const { t } = useT();
  return <span className="tabular">{t('settings.version', { v: APP_VERSION })}</span>;
}

function InfoScreen({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <CenterScreen footer={<Footer />}>
      <Logo />
      <h1 className="mt-10 text-2xl font-semibold tracking-tight">{title}</h1>
      {children ? <div className="mt-2 text-sm whitespace-pre-line text-muted">{children}</div> : null}
      {actions ? <div className="mt-8 flex flex-col gap-2">{actions}</div> : null}
    </CenterScreen>
  );
}

function RetryButton() {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="lg"
      block
      loading={busy}
      icon={<RotateCw size={16} />}
      onClick={async () => {
        setBusy(true);
        await runCheck();
        setBusy(false);
      }}
    >
      {t('lock.retry')}
    </Button>
  );
}

export function CheckingScreen() {
  const { t } = useT();
  return (
    <CenterScreen footer={<Footer />}>
      <div className="flex flex-col items-center gap-4 text-muted">
        <Spinner />
        <p className="text-sm">{t('access.checking')}</p>
      </div>
    </CenterScreen>
  );
}

const INVITE_ERRORS: Record<string, TKey> = {
  unknown_code: 'invite.unknown',
  code_in_use: 'invite.inUse',
  offline: 'invite.offline',
};

export function InviteScreen() {
  const { t } = useT();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TKey | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await runCheck(code);
    setBusy(false);
    if (result.status === 'offline') setError(INVITE_ERRORS.offline);
    else if (result.status === 'denied' && INVITE_ERRORS[result.reason]) setError(INVITE_ERRORS[result.reason]);
  };

  return (
    <CenterScreen footer={<Footer />}>
      <Logo size="lg" />
      <h1 className="mt-10 text-2xl font-semibold tracking-tight">{t('invite.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('invite.text')}</p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <Field label={t('invite.label')} htmlFor="invite">
          <Input
            id="invite"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD-2345"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className="text-center text-lg tracking-widest tabular"
            maxLength={16}
            required
          />
        </Field>
        {error ? <Banner tone="danger">{t(error)}</Banner> : null}
        <Button type="submit" size="lg" block loading={busy} disabled={code.replace(/[^A-Za-z0-9]/g, '').length < 4}>
          {t('invite.submit')}
        </Button>
      </form>
    </CenterScreen>
  );
}

export function LockScreen({ reason, graceHours = DEFAULT_GRACE_HOURS }: { reason: 'denied' | 'expired'; graceHours?: number }) {
  const { t } = useT();
  return (
    <InfoScreen
      title={t('lock.title')}
      actions={
        <>
          <RetryButton />
          {reason === 'denied' ? (
            <Button variant="ghost" block onClick={forgetInviteCode}>
              {t('lock.otherCode')}
            </Button>
          ) : null}
        </>
      }
    >
      {reason === 'expired' ? t('lock.expired', { h: graceHours }) : t('lock.text')}
    </InfoScreen>
  );
}

export function ShutdownScreen({ message }: { message: string }) {
  const { t } = useT();
  return (
    <InfoScreen title={t('shutdown.title')} actions={<RetryButton />}>
      {message || null}
    </InfoScreen>
  );
}

export function openExternal(url: string): void {
  // In the APK, navigating to another host opens the system browser (the APK downloads there).
  if (isNative()) window.location.href = url;
  else window.open(url, '_blank', 'noopener');
}

async function reloadLatest(): Promise<void> {
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  await reg?.update().catch(() => undefined);
  window.location.reload();
}

export function UpdateRequiredScreen({ apk }: { apk: LatestApk | null }) {
  const { t } = useT();
  const native = isNative();
  return (
    <InfoScreen
      title={t('update.title')}
      actions={
        native ? (
          apk ? (
            <Button size="lg" block icon={<Download size={16} />} onClick={() => openExternal(apk.url)}>
              {t('update.download')}
            </Button>
          ) : (
            <RetryButton />
          )
        ) : (
          <Button size="lg" block icon={<RotateCw size={16} />} onClick={() => void reloadLatest()}>
            {t('update.reload')}
          </Button>
        )
      }
    >
      {native ? t('update.text') : t('update.webText')}
    </InfoScreen>
  );
}

export function RecoveryBanner({ message }: { message: string }) {
  const { t } = useT();
  return (
    <div className="border-t border-line bg-warning-soft">
      <div className="mx-auto max-w-2xl px-4 py-2 text-sm">
        <span className="font-medium">{t('recovery.title')}.</span> <span className="text-muted">{message || t('recovery.text')}</span>
      </div>
    </div>
  );
}

export function UpdateBanner({ apk }: { apk: LatestApk }) {
  const { t } = useT();
  return (
    <div className="border-t border-line bg-accent-soft">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2 text-sm">
        <span className="flex-1">{t('update.banner', { v: apk.version })}</span>
        <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => openExternal(apk.url)}>
          {t('update.bannerAction')}
        </Button>
      </div>
    </div>
  );
}

export function RecoveryOnlyScreen({ message }: { message: string }) {
  const { t } = useT();
  return (
    <InfoScreen title={t('recovery.title')} actions={<RetryButton />}>
      {message || t('recovery.text')}
    </InfoScreen>
  );
}
