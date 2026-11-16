# ProEd progress

Status: COMPLETE (phases 1-12 done; waiting for the user ngrok domain to set SERVER_URL and rebuild the APKs in server mode)

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
- [DONE] 10.1 Build every package, run tests
- [DONE] 10.2 Emoji scan and cleanup
- [DONE] 10.3 Secrets scan (.env ignored, no keys committed)
- [DONE] 10.4 Record demo videos of the apps (Playwright) and send them
- [DONE] 10.5 PROGRESS.md "complete" + final checklist, commit + push

## Phase 11: Serverless APKs (GitHub repo as the shared store)
- [DONE] 11.1 Shared: invite code hashing (PBKDF2) + public config type + claimsFromConfig, tests
- [DONE] 11.2 Student app: serverless access mode (reads proed-config.json from raw.githubusercontent.com), no heartbeat
- [DONE] 11.3 Admin app: GitHub backend (Contents API) behind the same api() calls, GitHub token login
- [DONE] 11.4 Admin UI: serverless dashboard, APK link instead of upload, audit from commits, labels kept on the device
- [DONE] 11.5 Initial proed-config.json, workflow env (VITE_CONFIG_URL / VITE_GITHUB_REPO), README
- [DONE] 11.6 Typecheck, build, tests, commit, run the APK workflow, verify links

## Phase 12: Phone server (Termux + ngrok) and open access (user request)
- [DONE] 12.1 Server: SQLite adapter (better-sqlite3, or node:sqlite when the native module is missing), better-sqlite3 optional
- [DONE] 12.2 Server: open access (OPEN_ACCESS=true): /api/check without invite code registers the device/user; tests
- [DONE] 12.3 Student app: no invite screen in open access (auto check), ngrok-skip-browser-warning header
- [DONE] 12.4 Admin app: native HTTP, open-access user list (rename, beta/normal, block), hide invite creation
- [DONE] 12.5 Phone bundle (ProEd-Server.zip) built by CI + Termux install/start scripts (ngrok static domain)
- [DONE] 12.6 Typecheck, build, tests, README, commit, CI run, verify

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
- After phase 10 (user request): the server also hosts the web version of ProEd Admin at /console/ (proed-admin built with `build:web`, base /console/, into dist-web). The PWA service worker ignores /console, /admin and /api.
- APKs are built by GitHub Actions and published to the release "apk-latest": https://github.com/jlironbahar-svg/Pro-ed/releases/download/apk-latest/ProEd.apk and .../ProEd-Admin.apk (first build OK, run 43699979729). They are built for the server https://proed-jlb.fly.dev (app name in fly.toml). Debug-signed until the keystore secrets are added.
- Phase 11: the published APKs run without any server. ProEd Admin (GitHub mode, fine-grained token with Contents read/write) writes proed-config.json; ProEd reads it from raw.githubusercontent.com/<repo>/HEAD/proed-config.json. Names and plain codes stay on the admin phone; codes are PBKDF2 hashes (150k iterations). No live data in this mode. Tested end to end with a mocked GitHub API.
- Fix (user report "Impossible de joindre ce serveur Pronote"): Pronote 2026 writes `Start ({...});} catch` and pawnote 1.6.2 expects `)} catch`, so every login failed with PageUnavailableError. fixPronoteContent() in pronote/fetcher.ts removes the semicolon (both fetchers). Reproduced and verified against a real school from the VM. Wrong credentials on ENT schools now suggest the QR code.
- Pronote library: pawnote is archived (last release 1.6.2, Sept 2025) and breaks on Pronote 2026 (session page parsing, password key derivation, challenge, token re-login). Switched (user approved) to the maintained fork @blockshub/pawnote-lts pinned at 1.6.4: reviewed the diff (3 source files) and the dist (no new URLs or risky APIs, same deps). Verified from the VM against real schools: the login now reaches Pronote's authentication and is refused only for the fake password. The temporary page shim was removed.
- CI signing: Android Gradle no longer keeps its debug key at ~/.android/debug.keystore on the runner, so the cache saved nothing and every build had a new signature. Now the workflow creates a ProEd key on the first build, keeps it in the Actions cache (key proed-signing-<app>-v1, expires after 7 days without builds) and always builds signed release APKs. User keystore secrets take priority. Note: caches of a public repo are not a vault; the user's own secrets are the long-term answer. Verified: two consecutive builds (runs 43864647612, 43865105842) have the same certificates (ProEd e3fd4ad4..., Admin 7ab32b4f...).
- Phase 12 decisions (user): invite codes removed (open access: anyone with the app; admin sees each phone/user, sets beta/normal/blocked; no names stored). Fixed public address with a free ngrok static domain; server runs on the user's Nexus 6 (Android 7.1.1, 32-bit) in Termux.
- Phone test (user photo): Termux + nodejs-lts 24.22.3 on the Nexus 6: `require('node:sqlite')` aborts the process (SIGABRT, cannot be caught). Added a third SQLite driver, sql.js (WebAssembly, pure JS, in-memory with file save 1 s after changes and on close), selected with PROED_SQLITE=sqljs. install.sh now checks that Node starts (falls back to the nodejs package), tests node:sqlite in a subshell and picks the driver. All 22 server tests pass on better-sqlite3, node:sqlite and sql.js; persistence verified.
- Phone test 2 (user photo): `CANNOT LINK EXECUTABLE "curl": cannot locate symbol SSL_set_quic_tls_early_data_enabled`: the GitHub Termux bootstrap is older than the repo, and installing curl without upgrading openssl broke it. install.sh and the Windows helper now run `pkg upgrade -y` first (non-interactive dpkg options). The Windows helper downloads install.sh to a file (no pipe) so a failed download is reported instead of looking like success.
- Phone test 3: `pkg upgrade` fails too (pkg uses curl for mirror selection). Scripts now use apt-get update / full-upgrade / install, which do not need curl. The Windows helper adds ?t=<time> to the install.sh URL to skip GitHub's raw cache.
- Phone test 4 (user photos): server runs on the Nexus 6 (node:sqlite works after the full upgrade). ngrok never connected: proot (termux-chroot) crashes on this kernel (`assertion IS_IN_SYSENTER failed`, signal 6). ngrok now runs directly with its own config (version 2, authtoken, dns_resolver_ips 1.1.1.1/8.8.8.8) because Android has no /etc/resolv.conf. The old start check also matched "ok" inside ngrok's error page (fixed: looks for "ok":true).
- iPhone: not possible without a server (Apple allows no sideloaded apps; a PWA needs an HTTPS host and a CORS relay for Pronote). Not built.
- Demo videos (Playwright, recorded in the VM) were sent to the user: build + tests, student app, admin app, access control. They are not committed (binary files).

## Final checklist: what you must do yourself
1. Install Node 22 and run `npm install`, then `npm run setup -w proed-server` locally to try everything (README section 1).
2. Deploy the server + PWA on Fly.io (README section 3): create the app and volume, import the secrets, `fly deploy`, then run the setup on the server to get your admin password, 2FA QR code and first invite code.
3. Scan the 2FA QR code with an authenticator app and store the admin password in a password manager.
4. Create a keystore for each Android app, back them up in two places, never commit them (README section 2).
5. Build the APKs: Android Studio (`npm run android:release -w proed-app` / `-w proed-admin`) or the GitHub Actions workflow (set the `PROED_SERVER_URL` variable first). Building was not possible inside the cloud VM (Maven Central rate limits).
6. Test the student app with your own Pronote account (no real account was available during the build), on an iPhone (Safari, Add to Home Screen) and on Android.
7. If your school's Pronote is not on `*.index-education.net`, add its host to `RELAY_EXTRA_HOSTS`.
8. Upload the ProEd APK in ProEd Admin > System so students get the download link, then create one invite code per student and share the student guide (README section 4).
