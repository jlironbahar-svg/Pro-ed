import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import type { SystemSettings, SystemState } from '@proed/shared/core';
import { Banner, Button, Field, Input, Segmented, Spinner, Textarea, cx } from '@proed/shared/ui';
import { useT } from '../lib/i18n';
import { api, ApiError, isGithubMode, json } from '../lib/api';
import { formatAgo, formatSize } from '../lib/format';
import { usePolling } from '../lib/usePolling';
import { Section } from '../components/Section';

const STATES: SystemState[] = ['ACTIVE', 'RECOVERY', 'SHUTDOWN'];

export function SystemScreen() {
  const { t, lang } = useT();
  const { data, setData } = usePolling(() => api<SystemSettings>('/admin/system'));
  const [state, setState] = useState<SystemState>('ACTIVE');
  const [message, setMessage] = useState('');
  const [minVersion, setMinVersion] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'saved' | 'error' | null>(null);

  const [apkVersion, setApkVersion] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);

  useEffect(() => {
    if (!data) return;
    setState(data.state);
    setMessage(data.message);
    setMinVersion(data.minVersion);
  }, [data]);

  if (!data) {
    return (
      <div className="flex justify-center py-16 text-muted">
        <Spinner />
      </div>
    );
  }

  const dirty = state !== data.state || message !== data.message || minVersion !== data.minVersion;

  const save = async () => {
    if (state === 'SHUTDOWN' && data.state !== 'SHUTDOWN' && !window.confirm(t('system.confirmShutdown'))) return;
    setSaving(true);
    setStatus(null);
    try {
      setData(await api<SystemSettings>('/admin/system', { method: 'PUT', body: json({ state, message, minVersion: minVersion.trim() }) }));
      setStatus('saved');
    } catch {
      setStatus('error');
    }
    setSaving(false);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(false);
    const form = new FormData();
    form.append('file', file, file.name);
    try {
      setData(await api<SystemSettings>(`/admin/apk?version=${encodeURIComponent(apkVersion.trim())}`, { method: 'POST', body: form }));
      setFile(null);
      setApkVersion('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setUploadError(e instanceof ApiError);
    }
    setUploading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <Section title={t('system.state')}>
        <div className="flex flex-col gap-5">
          <div>
            <Segmented
              label={t('system.state')}
              value={state}
              onChange={setState}
              options={STATES.map((s) => ({ value: s, label: t(`system.${s}`) }))}
              className="w-full"
            />
            <p className={cx('mt-2 text-sm', state === 'SHUTDOWN' ? 'text-danger' : state === 'RECOVERY' ? 'text-warning' : 'text-muted')}>
              {t(`system.${state}.hint`)}
            </p>
          </div>
          <Field label={t('system.message')} htmlFor="message" hint={t('system.messageHint')}>
            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} className="text-sm" />
          </Field>
          <Field label={t('system.minVersion')} htmlFor="minVersion" hint={t('system.minVersionHint')}>
            <Input id="minVersion" value={minVersion} onChange={(e) => setMinVersion(e.target.value)} placeholder="1.0.0" className="font-mono text-sm sm:w-40" />
          </Field>
          {status === 'saved' && !dirty ? <p className="text-sm text-success">{t('common.saved')}</p> : null}
          {status === 'error' ? <Banner tone="danger">{t('common.error')}</Banner> : null}
          <Button onClick={save} loading={saving} disabled={!dirty} className="self-start">
            {t('common.save')}
          </Button>
        </div>
      </Section>

      {isGithubMode() ? (
        <ApkLinkSection system={data} onSaved={setData} />
      ) : (
      <Section title={t('system.apk')} hint={t('system.apkHint')}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {data.latestApk
              ? t('system.apkCurrent', {
                  v: data.latestApk.version,
                  size: formatSize(data.latestApk.size),
                  ago: formatAgo(data.latestApk.uploadedAt, Date.now(), lang),
                })
              : t('system.apkNone')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('system.apkVersion')} htmlFor="apkVersion">
              <Input id="apkVersion" value={apkVersion} onChange={(e) => setApkVersion(e.target.value)} placeholder="1.1.0" className="font-mono text-sm" />
            </Field>
            <Field label={t('system.apkFile')} htmlFor="apkFile">
              <div className="flex h-11 items-center gap-3">
                <input
                  ref={fileRef}
                  id="apkFile"
                  type="file"
                  accept=".apk,application/vnd.android.package-archive"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  {t('system.apkChoose')}
                </Button>
                <span className="min-w-0 truncate text-sm text-muted">{file ? file.name : t('system.apkNoFile')}</span>
              </div>
            </Field>
          </div>
          {uploadError ? <Banner tone="danger">{t('common.error')}</Banner> : null}
          <Button
            variant="secondary"
            icon={<Upload size={16} />}
            onClick={upload}
            loading={uploading}
            disabled={!file || !/^\d+(\.\d+){0,3}$/.test(apkVersion.trim())}
            className="self-start"
          >
            {t('system.apkUpload')}
          </Button>
        </div>
      </Section>
      )}
    </div>
  );
}

const RELEASE_URL = import.meta.env.VITE_GITHUB_REPO
  ? `https://github.com/${import.meta.env.VITE_GITHUB_REPO}/releases/download/apk-latest/ProEd.apk`
  : '';

/** GitHub mode: the APK is published by GitHub Actions; the admin only sets the latest version and its link. */
function ApkLinkSection({ system, onSaved }: { system: SystemSettings; onSaved: (s: SystemSettings) => void }) {
  const { t } = useT();
  const [version, setVersion] = useState(system.latestApk?.version ?? '');
  const [url, setUrl] = useState(system.latestApk?.url ?? RELEASE_URL);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'saved' | 'error' | null>(null);
  const valid = /^\d+(\.\d+){0,3}$/.test(version.trim()) && /^https:\/\//.test(url.trim());
  return (
    <Section title={t('system.apk')} hint={t('system.apkLinkHint')}>
      <div className="flex flex-col gap-4">
        <Field label={t('system.apkVersion')} htmlFor="apkV">
          <Input id="apkV" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" className="font-mono text-sm sm:w-40" />
        </Field>
        <Field label={t('system.apkLink')} htmlFor="apkUrl">
          <Input id="apkUrl" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" autoCapitalize="none" className="font-mono text-xs" />
        </Field>
        {status === 'saved' ? <p className="text-sm text-success">{t('common.saved')}</p> : null}
        {status === 'error' ? <Banner tone="danger">{t('common.error')}</Banner> : null}
        <Button
          variant="secondary"
          className="self-start"
          loading={busy}
          disabled={!valid}
          onClick={async () => {
            setBusy(true);
            setStatus(null);
            try {
              onSaved(await api<SystemSettings>('/admin/system', { method: 'PUT', body: json({ latestApk: { version: version.trim(), url: url.trim() } }) }));
              setStatus('saved');
            } catch {
              setStatus('error');
            }
            setBusy(false);
          }}
        >
          {t('system.apkSave')}
        </Button>
      </div>
    </Section>
  );
}
