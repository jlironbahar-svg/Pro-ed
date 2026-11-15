import { startOfDay } from '../lib/format';
import type { Homework } from './model';

/** End of the next school day: tomorrow, or Monday when today is Friday or Saturday. */
export function todayWindowEnd(now: number): number {
  const day = new Date(now).getDay();
  const add = day === 5 ? 3 : day === 6 ? 2 : 1;
  const end = new Date(startOfDay(now));
  end.setDate(end.getDate() + add + 1);
  return end.getTime() - 1;
}

export interface TodayPlan {
  todo: Homework[];
  done: Homework[];
  totalMinutes: number;
  laterCount: number;
}

/** Homework to work on today, in the suggested order: closest due date first, then shortest. */
export function planToday(
  items: Homework[],
  isDone: (h: Homework) => boolean,
  estimate: (h: Homework) => number,
  now: number,
): TodayPlan {
  const from = startOfDay(now);
  const to = todayWindowEnd(now);
  const inWindow = items.filter((h) => h.due >= from && h.due <= to);
  const todo = inWindow
    .filter((h) => !isDone(h))
    .sort((a, b) => startOfDay(a.due) - startOfDay(b.due) || estimate(a) - estimate(b) || a.subject.localeCompare(b.subject));
  const done = inWindow.filter(isDone);
  const laterCount = items.filter((h) => h.due > to && !isDone(h)).length;
  return { todo, done, totalMinutes: todo.reduce((sum, h) => sum + estimate(h), 0), laterCount };
}
