import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useT } from '../lib/i18n';
import { formatDayKey } from '../lib/format';

interface Point {
  day: string;
  users: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const { t, lang } = useT();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs">
      <p className="text-muted">{formatDayKey(p.day, lang)}</p>
      <p className="mt-0.5 font-medium text-fg tabular">{t('dash.chartUsers', { n: p.users })}</p>
    </div>
  );
}

/** Daily active users, one series: brand blue bars, recessive axes, hover tooltip, table view for accessibility. */
export function DailyChart({ data }: { data: Point[] }) {
  const { t, lang } = useT();
  const [table, setTable] = useState(false);
  return (
    <div>
      <div className="h-48 w-full" role="img" aria-label={t('dash.chart')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--pe-line)" />
            <XAxis
              dataKey="day"
              tickFormatter={(d: string) => formatDayKey(d, lang)}
              tick={{ fontSize: 11, fill: 'var(--pe-faint)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--pe-line)' }}
              interval={6}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--pe-faint)' }} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--pe-subtle)' }} isAnimationActive={false} />
            <Bar dataKey="users" fill="var(--pe-chart)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <button type="button" className="mt-2 text-xs text-accent-text hover:underline" onClick={() => setTable((v) => !v)}>
        {t('dash.table')}
      </button>
      {table ? (
        <table className="mt-2 w-full text-xs tabular">
          <tbody>
            {data
              .slice()
              .reverse()
              .map((p) => (
                <tr key={p.day} className="border-t border-line">
                  <td className="py-1 text-muted">{formatDayKey(p.day, lang)}</td>
                  <td className="py-1 text-right">{p.users}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
