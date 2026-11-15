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
- [DOING NOW] 2.1 Scaffold /proed-app (Vite, React, TS, Tailwind using shared preset)
- [TODO] 2.2 Install pawnote, read README + .d.ts, write notes in PROGRESS.md decisions
- [TODO] 2.3 i18n (FR default, EN), theme (light/dark/system), settings store (idb-keyval)
- [TODO] 2.4 Pronote layer: fetcher (relay for web, CapacitorHttp for native), login (credentials, QR code), session save/restore, homework fetch
- [TODO] 2.5 Estimates engine (rules + per-subject average from timers) and timer store
- [TODO] 2.6 Login screen (school search / URL, username, password, QR code)
- [TODO] 2.7 Homework list screen (sorted, attachments, done, edit estimate, timer, pull to refresh)
- [TODO] 2.8 Today view (summary + suggested order)
- [TODO] 2.9 Settings screen, offline cache, service worker + manifest
- [TODO] 2.10 Typecheck + build, commit + push

## Phase 3: Server part 1
- [TODO] 3.1 Scaffold /server (Fastify, TS, env config, logger with redaction)
- [TODO] 3.2 Pronote relay /relay (no body/secret logging, HTTPS-only target, host allowlist)
- [TODO] 3.3 Serve PWA build (static, SPA fallback, cache headers for sw)
- [TODO] 3.4 Dockerfile + .env.example
- [TODO] 3.5 Typecheck + build, smoke test, commit + push

## Phase 4: Capacitor Android for proed-app
- [TODO] 4.1 Install Capacitor core/cli/android/preferences, capacitor.config.ts (CapacitorHttp enabled, name "ProEd")
- [TODO] 4.2 Add android platform (npx cap add android) and sync
- [TODO] 4.3 Android icons + splash + app name, network security config
- [TODO] 4.4 Build scripts (debug/release gradle), signing config template
- [TODO] 4.5 Typecheck + build, commit + push

## Phase 5: Server part 2
- [TODO] 5.1 SQLite schema + db module (users, devices, settings, flags, events, audit, admin)
- [TODO] 5.2 System state, flags, version settings modules
- [TODO] 5.3 POST /api/check (invite code + device id + username hash, signed JWT)
- [TODO] 5.4 POST /api/heartbeat + presence
- [TODO] 5.5 Rate limiting on all routes, APK download route
- [TODO] 5.6 Setup script (admin account + TOTP QR + first invite code)
- [TODO] 5.7 Typecheck + build, smoke test, commit + push

## Phase 6: ProEd app integration
- [TODO] 6.1 Access client: device id, username hash, check call, JWT verify/decode, cache
- [TODO] 6.2 Grace period logic (72 h configurable) + 15 min periodic check
- [TODO] 6.3 Invite-code screen
- [TODO] 6.4 Lock / shutdown / update-required screens, recovery banner, update banner
- [TODO] 6.5 Heartbeat every 60 s, feature flags hook
- [TODO] 6.6 Typecheck + build, commit + push

## Phase 7: ProEd Admin
- [TODO] 7.1 Admin API: login (password + TOTP), admin JWT, guard, audit log helper
- [TODO] 7.2 Admin API: dashboard stats, online list, DAU 30 days, recent events
- [TODO] 7.3 Admin API: users CRUD, invite codes, block/unblock, channel
- [TODO] 7.4 Admin API: flags, system state, min version, APK upload, audit list
- [TODO] 7.5 Scaffold /proed-admin (Vite, React, Tailwind shared preset, Recharts)
- [TODO] 7.6 Admin screens: login, dashboard, users, user details, invites
- [TODO] 7.7 Admin screens: beta + flags, system controls + APK upload, audit log
- [TODO] 7.8 Capacitor Android for admin (name "ProEd Admin", icons)
- [TODO] 7.9 Typecheck + build, commit + push

## Phase 8: Tests
- [TODO] 8.1 Vitest setup in workspaces
- [TODO] 8.2 Estimate tests
- [TODO] 8.3 Access check logic tests (client grace + server check)
- [TODO] 8.4 Presence logic tests
- [TODO] 8.5 Run all tests, commit + push

## Phase 9: Docs
- [TODO] 9.1 README: overview + run locally
- [TODO] 9.2 README: debug and signed APKs, keystore safety
- [TODO] 9.3 README: deploy server + PWA with HTTPS (recommended host)
- [TODO] 9.4 README: student guide (APK install, iPhone home screen)
- [TODO] 9.5 Commit + push

## Phase 10: Final check
- [TODO] 10.1 Build every package, run tests
- [TODO] 10.2 Emoji scan and cleanup
- [TODO] 10.3 Secrets scan (.env ignored, no keys committed)
- [TODO] 10.4 Record demo videos of the apps (Playwright) and send them
- [TODO] 10.5 PROGRESS.md "complete" + final checklist, commit + push

## Decisions
- Node 22, npm workspaces. Root scripts run each workspace.
- Shared package is consumed as TypeScript source (no build step) via Vite + TS path resolution.
