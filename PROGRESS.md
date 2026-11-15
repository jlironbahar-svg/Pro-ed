# ProEd progress

Status: IN PROGRESS

Legend: TODO / DOING NOW / DONE. Exactly one step is DOING NOW at any time.

## Phase 1: Setup
- [DONE] 1.1 CLAUDE.md and SPEC.md
- [DONE] 1.2 PROGRESS.md with all phases split into steps
- [DONE] 1.3 Root monorepo: package.json (workspaces), tsconfig.base.json, .gitignore, .editorconfig
- [DONE] 1.4 /shared package: design tokens, Tailwind preset, base CSS (Inter, light/dark)
- [DONE] 1.5 /shared UI components (Button, Input, Card, Badge, Banner, Spinner, Screen, etc.) and shared types
- [DONE] 1.6 Logo: SVG mark + "ProEd" text logo component
- [DONE] 1.7 App icons (PWA png sizes, Android adaptive icon sources) generated from the SVG
- [DONE] 1.8 Install deps, typecheck shared, commit + push

## Phase 2: ProEd app core
- [DONE] 2.1 Scaffold /proed-app (Vite, React, TS, Tailwind using shared preset)
- [DONE] 2.2 Install pawnote, read README + .d.ts, write notes in PROGRESS.md decisions
- [DONE] 2.3 i18n (FR default, EN), theme (light/dark/system), settings store (idb-keyval)
- [DONE] 2.4 Pronote layer: fetcher (relay for web, CapacitorHttp for native), login (credentials, QR code), session save/restore, homework fetch
- [DONE] 2.5 Estimates engine (rules + per-subject average from timers) and timer store
- [DONE] 2.6 Login screen (school search / URL, username, password, QR code)
- [DONE] 2.7 Homework list screen (sorted, attachments, done, edit estimate, timer, pull to refresh)
- [DONE] 2.8 Today view (summary + suggested order)
- [DONE] 2.9 Settings screen, offline cache, service worker + manifest
- [DONE] 2.10 Typecheck + build, commit + push

## Phase 3: Server part 1
- [DONE] 3.1 Scaffold /server (Fastify, TS, env config, logger with redaction)
- [DONE] 3.2 Pronote relay /relay (no body/secret logging, HTTPS-only target, host allowlist)
- [DONE] 3.3 Serve PWA build (static, SPA fallback, cache headers for sw)
- [DONE] 3.4 Dockerfile + .env.example
- [DONE] 3.5 Typecheck + build, smoke test, commit + push

## Phase 4: Capacitor Android for proed-app
- [DONE] 4.1 Install Capacitor core/cli/android/preferences, capacitor.config.ts (CapacitorHttp enabled, name "ProEd")
- [DONE] 4.2 Add android platform (npx cap add android) and sync
- [DONE] 4.3 Android icons + splash + app name, network security config
- [DONE] 4.4 Build scripts (debug/release gradle), signing config template
- [DONE] 4.5 Typecheck + build, commit + push

## Phase 5: Server part 2
- [DONE] 5.1 SQLite schema + db module (users, devices, settings, flags, events, audit, admin)
- [DONE] 5.2 System state, flags, version settings modules
- [DONE] 5.3 POST /api/check (invite code + device id + username hash, signed JWT)
- [DONE] 5.4 POST /api/heartbeat + presence
- [DONE] 5.5 Rate limiting on all routes, APK download route
- [DONE] 5.6 Setup script (admin account + TOTP QR + first invite code)
- [DONE] 5.7 Typecheck + build, smoke test, commit + push

## Phase 6: ProEd app integration
- [DONE] 6.1 Access client: device id, username hash, check call, JWT verify/decode, cache
- [DONE] 6.2 Grace period logic (72 h configurable) + 15 min periodic check
- [DONE] 6.3 Invite-code screen
- [DONE] 6.4 Lock / shutdown / update-required screens, recovery banner, update banner
- [DONE] 6.5 Heartbeat every 60 s, feature flags hook
- [DONE] 6.6 Typecheck + build, commit + push

## Phase 7: ProEd Admin
- [DONE] 7.1 Admin API: login (password + TOTP), admin JWT, guard, audit log helper
- [DONE] 7.2 Admin API: dashboard stats, online list, DAU 30 days, recent events
- [DONE] 7.3 Admin API: users CRUD, invite codes, block/unblock, channel
- [DONE] 7.4 Admin API: flags, system state, min version, APK upload, audit list
- [DONE] 7.5 Scaffold /proed-admin (Vite, React, Tailwind shared preset, Recharts)
- [DONE] 7.6 Admin screens: login, dashboard, users, user details, invites
- [DONE] 7.7 Admin screens: beta + flags, system controls + APK upload, audit log
- [DONE] 7.8 Capacitor Android for admin (name "ProEd Admin", icons)
- [DONE] 7.9 Typecheck + build, commit + push

## Phase 8: Tests
- [DONE] 8.1 Vitest setup in workspaces
- [DONE] 8.2 Estimate tests
- [DONE] 8.3 Access check logic tests (client grace + server check)
- [DONE] 8.4 Presence logic tests
- [DONE] 8.5 Run all tests, commit + push

## Phase 9: Docs
- [DONE] 9.1 README: overview + run locally
- [DONE] 9.2 README: debug and signed APKs, keystore safety
- [DONE] 9.3 README: deploy server + PWA with HTTPS (recommended host)
- [DONE] 9.4 README: student guide (APK install, iPhone home screen)
- [DONE] 9.5 Commit + push

## Phase 10: Final check
- [DOING NOW] 10.1 Build every package, run tests
- [TODO] 10.2 Emoji scan and cleanup
- [TODO] 10.3 Secrets scan (.env ignored, no keys committed)
- [TODO] 10.4 Record demo videos of the apps (Playwright) and send them
- [TODO] 10.5 PROGRESS.md "complete" + final checklist, commit + push

## Decisions
- Node 22, npm workspaces. Root scripts run each workspace.
- Shared package is consumed as TypeScript source (no build step) via Vite + TS path resolution.
- pawnote 1.6.2 notes (read from dist/index.d.mts):
  - createSessionHandle(fetcher) ; loginCredentials(session, {url, kind: AccountKind.STUDENT, username, password, deviceUUID, navigatorIdentifier?}) -> RefreshInformation {url, token, username, kind, navigatorIdentifier}
  - loginToken(session, {url, kind, username, token, deviceUUID, navigatorIdentifier}) ; the token rotates: save the new one after every login.
  - loginQrCode(session, {deviceUUID, pin, qr}) where qr is the parsed QR JSON {jeton, login, url}.
  - SecurityError(handle) for 2FA: handle.shouldEnterPIN / shouldEnterSource handled with securityCheckPIN + securitySave + finishLoginManually; custom password / custom 2FA setup -> ask the student to do it on Pronote first.
  - assignmentsFromIntervals(session, start, end) -> Assignment {id, subject{name}, description (HTML), deadline: Date, done, attachments[{kind 0 link/1 file, name, url}], length?}. session.instance.lastDate caps the range.
  - assignmentStatus(session, id, done) syncs the done state (best effort).
  - geolocation({latitude, longitude}) POSTs to www.index-education.com/swie/geoloc.php. School search = geocode city/postcode with api-adresse.data.gouv.fr, then geolocation().
  - Fetcher: (req {url: URL, method, content, headers, redirect}) => {status, content, headers}. Pawnote sends "Cookie: appliMobile=1" and a User-Agent: browsers forbid these headers, so the web fetcher sends them as x-pe-cookie / x-pe-user-agent and the relay restores them.
- Web relay protocol: POST /relay with JSON {url, method, headers, body, redirect} -> JSON {status, headers, body}. Host allowlist: *.index-education.net, www.index-education.com, plus RELAY_EXTRA_HOSTS.
- APK: explicit CapacitorHttp.request in a custom fetcher (JSON responses come back parsed, re-stringified).
- @capacitor/core + @capacitor/preferences installed in phase 2 (needed by shared code); CLI/android added in phase 4.
- QR scanning with jsqr (camera via getUserMedia, photo fallback).
- Estimates: rule = base by type (exercise 25, revision 45, reading 30, project 60) x subject factor x length factor, or Pronote's own length when the teacher set one. Per-subject factor = shrunk mean of (real time / rule estimate) from timer data, clamped 0.4-2.5. Rounded to 5 min.
- Today view = not-done homework due today or by the next school day (Fri/Sat -> through Monday). Order: due date, then shortest.
- Access JWT: ES256. App verifies offline with WebCrypto against a pinned public key (from VITE_ACCESS_PUBLIC_KEY at build time, else the key returned by the first successful check).
- Invite code binds to the first Pronote username hash it is used with; other usernames get "code_in_use".
- Android: Capacitor 8 (minSdk 24, target 36). appId app.proed.student. CapacitorHttp enabled (native fetch). allowBackup=false so the Pronote token is not copied to cloud backups.
- Android build here is blocked: Maven Central answers HTTP 429 through this sandbox's proxy. APKs are built by the user (Android Studio or gradlew) or by the GitHub Actions workflow added in phase 9.
- Version name/code come from each app's package.json (scripts/android-gradle.mjs). Release signing reads android/keystore.properties or PROED_KEYSTORE_* env vars.
- GitHub Actions workflow (.github/workflows/android.yml) builds debug APKs (and signed release APKs when secrets exist), since this sandbox can't reach Maven Central reliably.
- Hosting: Fly.io recommended (Docker, volume for SQLite, automatic HTTPS, about 2 EUR/month). fly.toml at the root. The container starts as root only to chown the volume, then runs as "node" (setpriv).
- Fastify rejects unknown request fields (removeAdditional: false), so /api/check can never receive a password or homework.
