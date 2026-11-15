import { createStore, useStore } from '../lib/store';
import type { KnownFlag } from '@proed/shared/core';

/** Feature flags from the last access token. Known features default to on. */
export const flagsStore = createStore<Record<string, boolean>>({});

export function useFlag(key: KnownFlag): boolean {
  const flags = useStore(flagsStore);
  return flags[key] ?? true;
}
