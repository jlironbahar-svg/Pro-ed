import { describe, expect, it } from 'vitest';
import { planToday, todayWindowEnd } from './today';
import type { Homework } from './model';

const at = (y: number, m: number, d: number, h = 8) => new Date(y, m - 1, d, h).getTime();
const item = (id: string, due: number, subject = 'Français'): Homework => ({ id, subject, description: '', due, attachments: [], pronoteDone: false });

describe('todayWindowEnd', () => {
  it('covers tomorrow on a weekday', () => {
    const wed = at(2026, 11, 18, 17);
    expect(new Date(todayWindowEnd(wed)).getDate()).toBe(19);
  });
  it('covers Monday on Friday and Saturday', () => {
    expect(new Date(todayWindowEnd(at(2026, 11, 20, 17))).getDate()).toBe(23);
    expect(new Date(todayWindowEnd(at(2026, 11, 21, 10))).getDate()).toBe(23);
  });
});

describe('planToday', () => {
  const now = at(2026, 11, 18, 17); // Wednesday
  const items = [
    item('long-tomorrow', at(2026, 11, 19), 'Histoire'),
    item('short-tomorrow', at(2026, 11, 19), 'Anglais'),
    item('today', at(2026, 11, 18, 18)),
    item('next-week', at(2026, 11, 25)),
    item('done', at(2026, 11, 19)),
  ];
  const minutes: Record<string, number> = { 'long-tomorrow': 60, 'short-tomorrow': 20, today: 30, 'next-week': 45, done: 15 };
  const plan = planToday(items, (h) => h.id === 'done', (h) => minutes[h.id], now);

  it('orders by closest due date, then shortest', () => {
    expect(plan.todo.map((h) => h.id)).toEqual(['today', 'short-tomorrow', 'long-tomorrow']);
  });
  it('sums the estimates of what is left', () => {
    expect(plan.totalMinutes).toBe(110);
  });
  it('keeps done items apart and counts later ones', () => {
    expect(plan.done.map((h) => h.id)).toEqual(['done']);
    expect(plan.laterCount).toBe(1);
  });
});
