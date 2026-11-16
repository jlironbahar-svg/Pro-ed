import { useState, type FormEvent } from 'react';
import { ChevronRight, Copy, Plus, Search } from 'lucide-react';
import type { AdminUser, AdminUserDetails, SystemSettings } from '@proed/shared/core';
import { Badge, Banner, Button, Card, Field, Input, Sheet, Spinner } from '@proed/shared/ui';
import { useT } from '../lib/i18n';
import { api, isGithubMode, json } from '../lib/api';
import { formatAgo, formatDate } from '../lib/format';
import { usePolling } from '../lib/usePolling';
import { Empty } from '../components/Section';

export function UsersScreen() {
  const { t, lang } = useT();
  const [q, setQ] = useState('');
  const { data, reload } = usePolling(() => api<AdminUser[]>(`/admin/users?q=${encodeURIComponent(q)}`));
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const system = usePolling(() => (isGithubMode() ? Promise.resolve(null) : api<SystemSettings>('/admin/system')));
  const openAccess = !!system.data?.openAccess;
  const now = Date.now();
  const nameOf = (u: AdminUser) => u.label || (openAccess ? `${t('users.unnamed')} #${u.id.slice(0, 4)}` : u.code);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            void reload();
          }}
        >
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => void reload()} placeholder={t('users.search')} className="pl-9" enterKeyHint="search" />
        </form>
        {!openAccess ? (
          <Button size="lg" className="h-11" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            <span className="hidden sm:inline">{t('users.new')}</span>
          </Button>
        ) : null}
      </div>
      {openAccess ? <p className="px-1 text-sm text-muted">{t('users.openHint')}</p> : null}

      {!data ? (
        <div className="flex justify-center py-16 text-muted">
          <Spinner />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <Empty>{t('users.empty')}</Empty>
        </Card>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {data.map((u) => (
            <button key={u.id} type="button" onClick={() => setOpenId(u.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-subtle">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{nameOf(u)}</span>
                  {u.blocked ? <Badge tone="danger">{t('users.blocked')}</Badge> : null}
                  {u.channel === 'beta' ? <Badge tone="accent">{t('users.beta')}</Badge> : null}
                </p>
                <p className="truncate text-xs text-muted tabular">
                  {openAccess ? (u.deviceType ? `${t(`device.${u.deviceType}`)} · ` : '') : u.label ? `${u.code} · ` : ''}
                  {isGithubMode() ? '' : u.lastSeen ? t('users.lastSeen', { ago: formatAgo(u.lastSeen, now, lang) }) : t('users.notUsed')}
                </p>
              </div>
              <ChevronRight size={16} className="text-faint" />
            </button>
          ))}
        </Card>
      )}

      <CreateInviteSheet open={creating} onClose={() => setCreating(false)} onCreated={() => void reload()} />
      {openId ? (
        <UserSheet
          id={openId}
          openAccess={openAccess}
          onClose={() => setOpenId(null)}
          onChanged={() => void reload()}
          formatDate={(ts) => formatDate(ts, lang)}
        />
      ) : null}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const { t } = useT();
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<Copy size={14} />}
      onClick={async () => {
        await navigator.clipboard?.writeText(text).catch(() => undefined);
        setDone(true);
        window.setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? t('common.copied') : t('common.copy')}
    </Button>
  );
}

function CreateInviteSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { t } = useT();
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<AdminUser | null>(null);
  const [error, setError] = useState(false);

  const close = () => {
    setLabel('');
    setCreated(null);
    setError(false);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      setCreated(await api<AdminUser>('/admin/users', { method: 'POST', body: json({ label }) }));
      onCreated();
    } catch {
      setError(true);
    }
    setBusy(false);
  };

  return (
    <Sheet open={open} onClose={close} title={t('users.new')} closeLabel={t('common.close')}>
      {created ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">{t('users.created')}</p>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-subtle px-4 py-3">
            <span className="text-xl font-semibold tracking-widest tabular">{created.code}</span>
            <CopyButton text={created.code} />
          </div>
          <Button variant="ghost" onClick={close}>
            {t('common.close')}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t('users.label')} htmlFor="label">
            <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} autoFocus />
          </Field>
          {error ? <Banner tone="danger">{t('common.error')}</Banner> : null}
          <Button type="submit" size="lg" block loading={busy}>
            {t('users.create')}
          </Button>
        </form>
      )}
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium tabular">{value}</span>
    </div>
  );
}

function UserSheet({
  id,
  openAccess,
  onClose,
  onChanged,
  formatDate,
}: {
  id: string;
  openAccess: boolean;
  onClose: () => void;
  onChanged: () => void;
  formatDate: (ts: number) => string;
}) {
  const { t, lang } = useT();
  const { data, setData } = usePolling(() => api<AdminUserDetails>(`/admin/users/${id}`));
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const now = Date.now();

  const patch = async (key: string, body: object) => {
    setBusy(key);
    try {
      const updated = await api<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: json(body) });
      setData((d) => (d ? { ...d, ...updated } : d));
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('delete');
    await api(`/admin/users/${id}`, { method: 'DELETE' }).catch(() => undefined);
    onChanged();
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={t('users.details')} closeLabel={t('common.close')}>
      {!data ? (
        <div className="flex justify-center py-8 text-muted">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-lg font-semibold">{data.label || (openAccess ? `${t('users.unnamed')} #${data.id.slice(0, 4)}` : data.code)}</p>
            <div className="mt-1 flex gap-1.5">
              {data.blocked ? <Badge tone="danger">{t('users.blocked')}</Badge> : null}
              <Badge tone={data.channel === 'beta' ? 'accent' : 'neutral'}>{t(`channel.${data.channel}`)}</Badge>
            </div>
          </div>
          <div className="divide-y divide-line">
            {!openAccess ? <Info label={t('users.code')} value={data.code} /> : null}
            {!isGithubMode() ? (
              <>
                <Info label={t('users.lastSeenLabel')} value={data.lastSeen ? formatAgo(data.lastSeen, now, lang) : t('common.never')} />
                <Info label={t('users.device')} value={data.deviceType ? t(`device.${data.deviceType}`) : '-'} />
                <Info label={t('users.version')} value={data.appVersion ?? '-'} />
              </>
            ) : null}
            <Info label={t('users.channel')} value={t(`channel.${data.channel}`)} />
            <Info label={t('users.created_at')} value={formatDate(data.createdAt)} />
            {!isGithubMode() ? <Info label={t('users.bound')} value={data.bound ? t('common.yes') : t('common.no')} /> : null}
          </div>
          {data.devices.length > 0 ? (
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-faint uppercase">{t('users.devices')}</p>
              {data.devices.map((d) => (
                <p key={d.id} className="flex justify-between py-1 text-xs text-muted tabular">
                  <span>
                    {t(`device.${d.deviceType}`)} · {d.appVersion}
                  </span>
                  <span>{formatAgo(d.lastSeen, now, lang)}</span>
                </p>
              ))}
            </div>
          ) : null}
          <form
            className="flex flex-col gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (name !== null) void patch('label', { label: name.trim() }).then(() => setName(null));
            }}
          >
            <label htmlFor="user-name" className="text-sm font-medium">
              {t('users.rename')}
            </label>
            <div className="flex gap-2">
              <Input id="user-name" value={name ?? data.label} onChange={(e) => setName(e.target.value)} maxLength={60} className="h-10" />
              <Button type="submit" variant="secondary" className="h-10" loading={busy === 'label'} disabled={name === null || name.trim() === data.label}>
                {t('common.save')}
              </Button>
            </div>
            <p className="text-xs text-muted">{t('users.renameHint')}</p>
          </form>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" loading={busy === 'block'} onClick={() => patch('block', { blocked: !data.blocked })}>
              {data.blocked ? t('users.unblock') : t('users.block')}
            </Button>
            <Button variant="secondary" loading={busy === 'channel'} onClick={() => patch('channel', { channel: data.channel === 'beta' ? 'normal' : 'beta' })}>
              {data.channel === 'beta' ? t('users.toNormal') : t('users.toBeta')}
            </Button>
          </div>
          {confirmDelete ? (
            <div className="rounded-lg border border-danger/30 bg-danger-soft p-3">
              <p className="text-sm">{t('users.deleteConfirm', { name: data.label || data.code })}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="danger" size="sm" loading={busy === 'delete'} onClick={remove}>
                  {t('common.delete')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>
              {t('users.delete')}
            </Button>
          )}
        </div>
      )}
    </Sheet>
  );
}
