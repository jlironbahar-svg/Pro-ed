import { useMemo, useState, type FormEvent } from 'react';
import { ChevronRight, LocateFixed, QrCode, Search } from 'lucide-react';
import { Banner, Button, Card, Field, Input, Logo, Sheet, Spinner, cx } from '@proed/shared/ui';
import { useT, type TKey } from '../lib/i18n';
import { sessionStore } from '../lib/session';
import { QrScanner } from '../components/QrScanner';
import { useFlag } from '../access/flags';
import { searchSchools, searchSchoolsNearMe, normalizePronoteUrl, type School } from '../pronote/schools';
import {
  completeSecurity,
  loginWithPassword,
  loginWithQr,
  parsePronoteQr,
  securityNeedsPin,
  type LoginResult,
  type PendingSecurity,
} from '../pronote/client';
import { AppError, toAppError } from '../pronote/errors';

type Step = { kind: 'school' } | { kind: 'credentials'; url: string; name: string } | { kind: 'security'; pending: PendingSecurity };

export function LoginScreen() {
  const { t } = useT();
  const [step, setStep] = useState<Step>({ kind: 'school' });
  const [qrOpen, setQrOpen] = useState(false);
  const qrEnabled = useFlag('qr_login');

  const handleResult = (result: LoginResult) => {
    if (result.status === 'ok') sessionStore.set(result.session);
    else setStep({ kind: 'security', pending: result.pending });
  };

  return (
    <div className="safe-top safe-bottom min-h-dvh bg-bg">
      <main className="mx-auto flex w-full max-w-md flex-col px-6 pt-12 pb-10">
        <Logo size="lg" />
        <h1 className="mt-10 text-2xl font-semibold tracking-tight">{t('login.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('login.subtitle')}</p>

        <div className="mt-8">
          {step.kind === 'school' && <SchoolStep onPick={(url, name) => setStep({ kind: 'credentials', url, name })} />}
          {step.kind === 'credentials' && (
            <CredentialsStep url={step.url} name={step.name} onBack={() => setStep({ kind: 'school' })} onResult={handleResult} />
          )}
          {step.kind === 'security' && (
            <SecurityStep pending={step.pending} onBack={() => setStep({ kind: 'school' })} />
          )}
        </div>

        {qrEnabled && step.kind !== 'security' ? (
          <div className="mt-8">
            <div className="flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-line" />
              {t('login.or')}
              <span className="h-px flex-1 bg-line" />
            </div>
            <Button variant="secondary" block className="mt-6" icon={<QrCode size={16} />} onClick={() => setQrOpen(true)}>
              {t('login.qr')}
            </Button>
            <p className="mt-2 text-center text-xs text-muted">{t('login.entHint')}</p>
          </div>
        ) : null}
      </main>

      <Sheet open={qrOpen} onClose={() => setQrOpen(false)} title={t('login.qrTitle')} closeLabel={t('login.back')}>
        {qrOpen ? (
          <QrLogin
            onResult={(r) => {
              setQrOpen(false);
              handleResult(r);
            }}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function SchoolStep({ onPick }: { onPick: (url: string, name: string) => void }) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [results, setResults] = useState<School[] | null>(null);
  const [busy, setBusy] = useState<'search' | 'near' | null>(null);
  const [error, setError] = useState<TKey | null>(null);
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState<TKey | null>(null);

  const run = async (kind: 'search' | 'near') => {
    setBusy(kind);
    setError(null);
    try {
      setResults(kind === 'search' ? await searchSchools(query) : await searchSchoolsNearMe());
      setFilter('');
    } catch (e) {
      setError(e instanceof Error && e.message === 'denied' ? 'error.locationDenied' : toAppError(e).key);
    } finally {
      setBusy(null);
    }
  };

  const shown = useMemo(() => {
    if (!results) return [];
    const f = filter.trim().toLowerCase();
    return (f ? results.filter((s) => s.name.toLowerCase().includes(f)) : results).slice(0, 40);
  }, [results, filter]);

  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    const url = normalizePronoteUrl(manual);
    if (!url) return setManualError('error.invalidUrl');
    onPick(url, new URL(url).hostname);
  };

  return (
    <section>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) void run('search');
        }}
      >
        <Field label={t('login.school')} htmlFor="school-q">
          <div className="flex gap-2">
            <Input
              id="school-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('login.searchPlaceholder')}
              autoComplete="address-level2"
              enterKeyHint="search"
            />
            <Button type="submit" variant="primary" size="lg" className="h-11 px-4" loading={busy === 'search'} aria-label={t('login.search')}>
              {busy === 'search' ? null : <Search size={18} />}
            </Button>
          </div>
        </Field>
      </form>
      <Button variant="ghost" size="sm" className="mt-2 -ml-2 text-accent-text" icon={busy === 'near' ? <Spinner size={14} /> : <LocateFixed size={16} />} onClick={() => run('near')} disabled={busy !== null}>
        {t('login.nearMe')}
      </Button>

      {error ? <p className="mt-3 text-sm text-danger">{t(error)}</p> : null}

      {results ? (
        <div className="mt-4">
          {results.length > 8 ? (
            <Input className="mb-3 h-10 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('login.filter')} />
          ) : null}
          {shown.length === 0 ? (
            <p className="py-4 text-sm text-muted">{t('login.noResults')}</p>
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {shown.map((s) => (
                <button
                  key={s.url}
                  type="button"
                  onClick={() => onPick(s.url, s.name)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-subtle"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="block text-xs text-muted tabular">
                      {s.postalCode} · {s.distanceKm < 10 ? s.distanceKm.toFixed(1) : Math.round(s.distanceKm)} km
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-faint" />
                </button>
              ))}
            </Card>
          )}
        </div>
      ) : null}

      <form onSubmit={submitManual} className="mt-8">
        <Field label={t('login.orUrl')} htmlFor="school-url" error={manualError ? t(manualError) : undefined}>
          <Input
            id="school-url"
            value={manual}
            onChange={(e) => {
              setManual(e.target.value);
              setManualError(null);
            }}
            placeholder="https://0000000a.index-education.net/pronote/"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="text-sm"
          />
        </Field>
        <Button type="submit" variant="secondary" block className="mt-3" disabled={!manual.trim()}>
          {t('login.continue')}
        </Button>
      </form>
    </section>
  );
}

function CredentialsStep({
  url,
  name,
  onBack,
  onResult,
}: {
  url: string;
  name: string;
  onBack: () => void;
  onResult: (r: LoginResult) => void;
}) {
  const { t } = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TKey | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onResult(await loginWithPassword(url, username, password));
    } catch (err) {
      setError(err instanceof AppError ? err.key : 'error.generic');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">{t('login.school')}</p>
          <p className="truncate text-sm font-medium">{name}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="text-accent-text">
          {t('login.change')}
        </Button>
      </div>
      <Field label={t('login.username')} htmlFor="pn-user">
        <Input id="pn-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
      </Field>
      <Field label={t('login.password')} htmlFor="pn-pass">
        <Input id="pn-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </Field>
      {error ? <Banner tone="danger">{t(error)}</Banner> : null}
      <Button type="submit" size="lg" block loading={busy} disabled={!username.trim() || !password}>
        {t('login.submit')}
      </Button>
    </form>
  );
}

function SecurityStep({ pending, onBack }: { pending: PendingSecurity; onBack: () => void }) {
  const { t } = useT();
  const needsPin = securityNeedsPin(pending);
  const blocked = pending.modal.shouldCustomPassword || pending.modal.shouldCustomDoubleAuth;
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TKey | null>(blocked ? 'error.securitySetup' : null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      sessionStore.set(await completeSecurity(pending, pin));
    } catch (err) {
      setError(toAppError(err).key);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">{t('login.pinTitle')}</h2>
        {needsPin ? <p className="mt-1 text-sm text-muted">{t('login.pinHint')}</p> : null}
      </div>
      {needsPin && !blocked ? (
        <Field label={t('login.pinLabel')} htmlFor="pn-pin">
          <Input id="pn-pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" autoComplete="one-time-code" maxLength={8} required />
        </Field>
      ) : null}
      {error ? <Banner tone="danger">{t(error)}</Banner> : null}
      {!blocked ? (
        <Button type="submit" size="lg" block loading={busy} disabled={needsPin && pin.length < 4}>
          {t('login.continue')}
        </Button>
      ) : null}
      <Button variant="ghost" onClick={onBack}>
        {t('login.back')}
      </Button>
    </form>
  );
}

function QrLogin({ onResult }: { onResult: (r: LoginResult) => void }) {
  const { t } = useT();
  const [qr, setQr] = useState<ReturnType<typeof parsePronoteQr>>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TKey | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!qr) return;
    setBusy(true);
    setError(null);
    try {
      onResult(await loginWithQr(qr, pin));
    } catch (err) {
      setError(err instanceof AppError ? err.key : 'error.generic');
      setBusy(false);
    }
  };

  if (!qr) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">{t('login.qrHint')}</p>
        <QrScanner accept={(text) => parsePronoteQr(text) !== null} onResult={(text) => setQr(parsePronoteQr(text))} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t('login.qrRead')}</p>
      <Field label={t('login.qrPin')} htmlFor="qr-pin">
        <Input
          id="qr-pin"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          autoComplete="off"
          className={cx('text-center text-xl tracking-[0.5em] tabular')}
          autoFocus
          required
        />
      </Field>
      {error ? <Banner tone="danger">{t(error)}</Banner> : null}
      <Button type="submit" size="lg" block loading={busy} disabled={pin.length !== 4}>
        {t('login.submit')}
      </Button>
      <Button variant="ghost" onClick={() => setQr(null)}>
        {t('login.qrRescan')}
      </Button>
    </form>
  );
}
