import { useEffect, useState } from 'react';
import { Spinner } from '@proed/shared/ui';
import { useStore } from './lib/store';
import { loadSettings } from './lib/settings';
import { sessionStore } from './lib/session';
import { loadCachedHomework } from './homework/store';
import { loadSavedSession } from './pronote/client';
import { LoginScreen } from './screens/LoginScreen';
import { MainShell } from './MainShell';

export function App() {
  const [ready, setReady] = useState(false);
  const session = useStore(sessionStore);

  useEffect(() => {
    (async () => {
      await loadSettings();
      await loadCachedHomework();
      sessionStore.set((await loadSavedSession()) ?? null);
      setReady(true);
    })();
  }, []);

  if (!ready || session === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-muted">
        <Spinner />
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  return <MainShell canRefresh />;
}
