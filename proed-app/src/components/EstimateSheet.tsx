import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button, IconButton, Input, Sheet } from '@proed/shared/ui';
import { useT } from '../lib/i18n';
import { formatDuration } from '../lib/format';

export function EstimateSheet({
  open,
  onClose,
  subject,
  current,
  auto,
  edited,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  subject: string;
  current: number;
  auto: number;
  edited: boolean;
  onSave: (minutes: number | undefined) => void;
}) {
  const { t } = useT();
  const [value, setValue] = useState(current);
  useEffect(() => {
    if (open) setValue(current);
  }, [open, current]);
  const clamp = (n: number) => Math.min(600, Math.max(5, Math.round(n)));

  return (
    <Sheet open={open} onClose={onClose} title={t('hw.estimateTitle')} closeLabel={t('settings.cancel')}>
      <p className="text-sm font-medium">{subject}</p>
      <p className="mt-1 text-sm text-muted">{t('hw.estimateHint')}</p>
      <div className="mt-6 flex items-center justify-center gap-4">
        <IconButton label="-5" onClick={() => setValue((v) => clamp(v - 5))} className="border border-line-strong">
          <Minus size={18} />
        </IconButton>
        <label className="flex flex-col items-center">
          <span className="sr-only">{t('hw.minutes')}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={5}
            max={600}
            step={5}
            value={value}
            onChange={(e) => setValue(clamp(Number(e.target.value) || 5))}
            className="h-14 w-28 text-center text-2xl font-semibold tabular"
          />
          <span className="mt-1 text-xs text-muted">{formatDuration(value)}</span>
        </label>
        <IconButton label="+5" onClick={() => setValue((v) => clamp(v + 5))} className="border border-line-strong">
          <Plus size={18} />
        </IconButton>
      </div>
      <p className="mt-6 text-center text-xs text-muted">{t('hw.estimateAuto', { d: formatDuration(auto) })}</p>
      <div className="mt-4 flex flex-col gap-2">
        <Button
          block
          size="lg"
          onClick={() => {
            onSave(value === auto && !edited ? undefined : value);
            onClose();
          }}
        >
          {t('hw.save')}
        </Button>
        {edited ? (
          <Button
            variant="ghost"
            block
            onClick={() => {
              onSave(undefined);
              onClose();
            }}
          >
            {t('hw.estimateReset')}
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
