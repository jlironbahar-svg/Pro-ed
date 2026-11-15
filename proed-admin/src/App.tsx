import { useEffect } from 'react';
import { Spinner, useStore } from '@proed/shared/ui';
import { loadSession, sessionStore } from './lib/api';
import { LoginScreen } from './screens/LoginScreen';
import { Shell } from './Shell';

export function App() {
  const session = useStore(sessionStore);
  useEffect(() => {
    void loadSession();
  }, []);

  if (session === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-muted">
        <Spinner />
      </div>
    );
  }
  return session ? <Shell /> : <LoginScreen />;
}
