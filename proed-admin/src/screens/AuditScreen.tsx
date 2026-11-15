import type { AuditEntry } from '@proed/shared/core';
import { Spinner } from '@proed/shared/ui';
import { useT } from '../lib/i18n';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { usePolling } from '../lib/usePolling';
import { Empty, Row, Section } from '../components/Section';

export function AuditScreen() {
  const { t, lang } = useT();
  const { data } = usePolling(() => api<AuditEntry[]>('/admin/audit?limit=300'), 30_000);
  return (
    <Section title={t('audit.title')} flush>
      {!data ? (
        <div className="flex justify-center py-8 text-muted">
          <Spinner />
        </div>
      ) : data.length === 0 ? (
        <Empty>{t('audit.empty')}</Empty>
      ) : (
        data.map((a) => <Row key={a.id} primary={<span className="font-mono text-xs">{a.action}</span>} secondary={a.detail || undefined} right={formatDateTime(a.at, lang)} />)
      )}
    </Section>
  );
}
