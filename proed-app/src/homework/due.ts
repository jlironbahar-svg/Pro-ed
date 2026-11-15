import { daysBetween, formatDay } from '../lib/format';
import type { Lang, TFunction } from '../lib/i18n';

export function dueLabel(due: number, now: number, t: TFunction, lang: Lang): string {
  const d = daysBetween(now, due);
  if (d < 0) return t('hw.overdue');
  if (d === 0) return t('hw.dueToday');
  if (d === 1) return t('hw.dueTomorrow');
  return t('hw.dueOn', { date: formatDay(due, lang) });
}
