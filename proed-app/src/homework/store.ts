import { createStore } from '../lib/store';
import { db } from '../lib/storage';
import { startOfDay } from '../lib/format';
import type { TKey } from '../lib/i18n';
import { fetchHomework, syncDone } from '../pronote/client';
import { toAppError } from '../pronote/errors';
import { autoEstimate, ruleEstimate } from './estimate';
import type { Homework, ItemState, TimeSample } from './model';

export interface HomeworkState {
  items: Homework[];
  fetchedAt: number | null;
  local: Record<string, ItemState>;
  samples: TimeSample[];
  loading: boolean;
  error: TKey | null;
}

const K = { items: 'hw:items', fetchedAt: 'hw:fetchedAt', local: 'hw:local', samples: 'hw:samples' };
const MAX_SAMPLES_PER_SUBJECT = 30;

export const homeworkStore = createStore<HomeworkState>({
  items: [],
  fetchedAt: null,
  local: {},
  samples: [],
  loading: false,
  error: null,
});

/** Set by the access layer: in RECOVERY mode, Pronote must not be called. */
let pronoteAllowed = () => true;
export function setPronoteGuard(fn: () => boolean): void {
  pronoteAllowed = fn;
}

export async function loadCachedHomework(): Promise<void> {
  const [items, fetchedAt, local, samples] = await Promise.all([
    db.get<Homework[]>(K.items),
    db.get<number>(K.fetchedAt),
    db.get<Record<string, ItemState>>(K.local),
    db.get<TimeSample[]>(K.samples),
  ]).catch(() => [undefined, undefined, undefined, undefined] as const);
  homeworkStore.set((s) => ({
    ...s,
    items: items ?? [],
    fetchedAt: fetchedAt ?? null,
    local: local ?? {},
    samples: samples ?? [],
  }));
}

function saveLocal(): void {
  const { local, samples } = homeworkStore.get();
  void db.set(K.local, local);
  void db.set(K.samples, samples);
}

let inflight: Promise<void> | null = null;

export function refreshHomework(): Promise<void> {
  if (!pronoteAllowed()) return Promise.resolve();
  if (inflight) return inflight;
  homeworkStore.set((s) => ({ ...s, loading: true, error: null }));
  inflight = (async () => {
    try {
      const items = await fetchHomework();
      const ids = new Set(items.map((i) => i.id));
      const now = Date.now();
      homeworkStore.set((s) => {
        const local: Record<string, ItemState> = {};
        for (const [id, st] of Object.entries(s.local)) if (ids.has(id) || st.timerStart) local[id] = st;
        return { ...s, items, fetchedAt: now, local, loading: false, error: null };
      });
      await Promise.all([db.set(K.items, items), db.set(K.fetchedAt, now)]);
      saveLocal();
    } catch (e) {
      homeworkStore.set((s) => ({ ...s, loading: false, error: toAppError(e).key }));
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function patchItem(id: string, patch: (st: ItemState) => ItemState): void {
  homeworkStore.set((s) => ({ ...s, local: { ...s.local, [id]: patch(s.local[id] ?? {}) } }));
  saveLocal();
}

export function isDone(hw: Homework, local: Record<string, ItemState>): boolean {
  return local[hw.id]?.done ?? hw.pronoteDone;
}

export function estimateFor(hw: Homework, state: Pick<HomeworkState, 'local' | 'samples'>): number {
  return state.local[hw.id]?.estimate ?? autoEstimate(hw, state.samples);
}

export function toggleDone(hw: Homework): void {
  const done = !isDone(hw, homeworkStore.get().local);
  if (done && homeworkStore.get().local[hw.id]?.timerStart) stopTimer(hw);
  patchItem(hw.id, (st) => ({ ...st, done }));
  if (pronoteAllowed()) void syncDone(hw.id, done);
}

export function setEstimate(id: string, minutes: number | undefined): void {
  patchItem(id, (st) => ({ ...st, estimate: minutes }));
}

export function startTimer(hw: Homework): void {
  const { items, local } = homeworkStore.get();
  for (const other of items) if (other.id !== hw.id && local[other.id]?.timerStart) stopTimer(other);
  patchItem(hw.id, (st) => ({ ...st, timerStart: Date.now() }));
}

export function stopTimer(hw: Homework): void {
  const st = homeworkStore.get().local[hw.id];
  if (!st?.timerStart) return;
  const spentMs = (st.spentMs ?? 0) + Math.max(0, Date.now() - st.timerStart);
  homeworkStore.set((s) => {
    const local = { ...s.local, [hw.id]: { ...st, spentMs, timerStart: undefined } };
    let samples = s.samples;
    if (spentMs >= 60_000) {
      const sample: TimeSample = {
        homeworkId: hw.id,
        subject: hw.subject,
        ruleMinutes: ruleEstimate(hw),
        actualMinutes: spentMs / 60_000,
        at: Date.now(),
      };
      const others = samples.filter((x) => x.homeworkId !== hw.id);
      const sameSubject = others.filter((x) => x.subject === hw.subject);
      const drop = new Set(sameSubject.slice(0, Math.max(0, sameSubject.length - (MAX_SAMPLES_PER_SUBJECT - 1))));
      samples = [...others.filter((x) => !drop.has(x)), sample];
    }
    return { ...s, local, samples };
  });
  saveLocal();
}

/** Upcoming items (due today or later), sorted by due date, then subject. */
export function upcoming(items: Homework[], now = Date.now()): Homework[] {
  const today = startOfDay(now);
  return items
    .filter((h) => h.due >= today)
    .sort((a, b) => a.due - b.due || a.subject.localeCompare(b.subject, 'fr') || a.id.localeCompare(b.id));
}

export async function clearHomework(): Promise<void> {
  homeworkStore.set({ items: [], fetchedAt: null, local: {}, samples: [], loading: false, error: null });
  await Promise.all(Object.values(K).map((k) => db.del(k)));
}
