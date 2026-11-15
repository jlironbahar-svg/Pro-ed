import type { Channel, FeatureFlag } from './types.js';

/** Turns flag modes into booleans for one user. */
export function resolveFlags(flags: Pick<FeatureFlag, 'key' | 'mode'>[], channel: Channel): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const f of flags) {
    out[f.key] = f.mode === 'on' || (f.mode === 'beta' && channel === 'beta');
  }
  return out;
}
