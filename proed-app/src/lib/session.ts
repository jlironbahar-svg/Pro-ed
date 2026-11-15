import { createStore } from './store';
import type { SavedSession } from '../pronote/client';

/** undefined while loading, null when signed out. */
export const sessionStore = createStore<SavedSession | null | undefined>(undefined);
