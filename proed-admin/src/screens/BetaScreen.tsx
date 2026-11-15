import { useState, type FormEvent } from 'react';
import type { AdminUser, FeatureFlag, FlagMode } from '@proed/shared/core';
import { Button, Input, Segmented, Spinner, Switch } from '@proed/shared/ui';
import { useT, type TKey } from '../lib/i18n';
import { KNOWN_FLAGS } from '@proed/shared/core';
import { api, json } from '../lib/api';
import { usePolling } from '../lib/usePolling';
import { Empty, Row, Section } from '../components/Section';

export function BetaScreen() {
  const { t } = useT();
  const users = usePolling(() => api<AdminUser[]>('/admin/users'));
  const flags = usePolling(() => api<FeatureFlag[]>('/admin/flags'));
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');

  const setChannel = async (u: AdminUser, beta: boolean) => {
    users.setData((list) => list?.map((x) => (x.id === u.id ? { ...x, channel: beta ? 'beta' : 'normal' } : x)) ?? null);
    await api(`/admin/users/${u.id}`, { method: 'PATCH', body: json({ channel: beta ? 'beta' : 'normal' }) }).catch(() => users.reload());
  };

  const setMode = async (f: FeatureFlag, mode: FlagMode) => {
    flags.setData(await api<FeatureFlag[]>(`/admin/flags/${f.key}`, { method: 'PUT', body: json({ mode }) }));
  };

  const addFlag = async (e: FormEvent) => {
    e.preventDefault();
    const k = key.trim().toLowerCase();
    if (!/^[a-z0-9_]{2,40}$/.test(k)) return;
    flags.setData(await api<FeatureFlag[]>(`/admin/flags/${k}`, { method: 'PUT', body: json({ mode: 'off', description: description.trim() }) }));
    setKey('');
    setDescription('');
  };

  const modes = [
    { value: 'on' as const, label: t('flag.on') },
    { value: 'beta' as const, label: t('flag.beta') },
    { value: 'off' as const, label: t('flag.off') },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Section title={t('beta.flags')} hint={t('beta.flagsHint')} flush>
        {!flags.data ? (
          <div className="flex justify-center py-8 text-muted">
            <Spinner />
          </div>
        ) : (
          flags.data.map((f) => (
            <div key={f.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm">{f.key}</p>
                {f.key in KNOWN_FLAGS ? (
                  <p className="text-xs text-muted">{t(`flagdesc.${f.key}` as TKey)}</p>
                ) : f.description ? (
                  <p className="text-xs text-muted">{f.description}</p>
                ) : null}
              </div>
              <Segmented label={f.key} value={f.mode} options={modes} onChange={(m) => void setMode(f, m)} />
            </div>
          ))
        )}
        <form onSubmit={addFlag} className="flex flex-col gap-2 bg-subtle px-4 py-3 sm:flex-row">
          <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder={t('flag.key')} className="h-10 font-mono text-sm" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('flag.description')} className="h-10 text-sm" />
          <Button type="submit" variant="secondary" className="h-10" disabled={!/^[a-z0-9_]{2,40}$/.test(key.trim().toLowerCase())}>
            {t('flag.add')}
          </Button>
        </form>
      </Section>

      <Section title={t('beta.program')} hint={t('beta.programHint')} flush>
        {!users.data ? (
          <div className="flex justify-center py-8 text-muted">
            <Spinner />
          </div>
        ) : users.data.length === 0 ? (
          <Empty>{t('users.empty')}</Empty>
        ) : (
          users.data.map((u) => (
            <Row
              key={u.id}
              primary={u.label || u.code}
              secondary={u.label ? u.code : undefined}
              right={<Switch label={t('channel.beta')} checked={u.channel === 'beta'} onChange={(v) => void setChannel(u, v)} />}
            />
          ))
        )}
      </Section>
    </div>
  );
}
