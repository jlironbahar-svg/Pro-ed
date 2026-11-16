import { useEffect, useState } from 'react';
import { Spinner } from '@proed/shared/ui';
import { useStore } from './lib/store';
import { loadSettings } from './lib/settings';
import { sessionStore } from './lib/session';
import { loadCachedHomework } from './homework/store';
import { loadSavedSession } from './pronote/client';
import { SERVERLESS, accessStore, loadAccess, startAccessLoop } from './access/controller';
import { LoginScreen } from './screens/LoginScreen';
import {
  CheckingScreen,
  InviteScreen,
  LockScreen,
  RecoveryBanner,
  RecoveryOnlyScreen,
  ShutdownScreen,
  UpdateBanner,
  UpdateRequiredScreen,
} from './screens/AccessScreens';
import { MainShell } from './MainShell';

export function App() {
  const [ready, setReady] = useState(false);
  const session = useStore(sessionStore);
  const access = useStore(accessStore);

  useEffect(() => {
    (async () => {
      await loadSettings();
      await Promise.all([loadCachedHomework(), loadAccess()]);
      sessionStore.set((await loadSavedSession()) ?? null);
      setReady(true);
      startAccessLoop();
    })();
  }, []);

  if (!ready || session === undefined || !access.ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-muted">
        <Spinner />
      </div>
    );
  }

  // Access control comes first: invite code (unless the server is in open access), then the access token.
  if (!access.inviteCode && (SERVERLESS || access.needsCode)) return <InviteScreen />;
  const view = access.view;
  if (!view) return access.checking ? <CheckingScreen /> : <LockScreen reason={access.inviteCode ? 'expired' : 'offline'} />;
  const graceHours = access.claims?.exp && access.claims.iat ? Math.round((access.claims.exp - access.claims.iat) / 3600) : undefined;
  if (view.kind === 'locked') return <LockScreen reason={view.reason} graceHours={graceHours} />;
  if (view.kind === 'shutdown') return <ShutdownScreen message={view.message} />;
  if (view.kind === 'update-required') return <UpdateRequiredScreen apk={view.apk} />;

  if (!session) return view.recovery ? <RecoveryOnlyScreen message={view.message} /> : <LoginScreen />;

  const banner = (
    <>
      {view.recovery ? <RecoveryBanner message={view.message} /> : null}
      {view.update ? <UpdateBanner apk={view.update} /> : null}
    </>
  );
  return <MainShell canRefresh={!view.recovery} banner={banner} />;
}
