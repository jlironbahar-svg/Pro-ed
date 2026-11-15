I'm a high school student building ProEd, a homework app for students at my school who use Pronote (the French school app by Index Education). Build the whole project autonomously, from start to finish. I'm on Claude Pro with limited usage, so work efficiently and avoid mistakes. My usage will run out several times during the build. Each time, I'll come back later and type "continue".

=== HOW TO WORK ===
- Fully autonomous: never ask me questions, never wait for plan approval, never stop to check with me between phases. Make sensible decisions yourself and write them down in PROGRESS.md.
- FIRST ACTION, before any code: create two files.
  1. CLAUDE.md (Claude Code loads it automatically in every session, even a brand-new chat) containing exactly these rules:
     "This is the ProEd project. The full spec is in SPEC.md. Progress is in PROGRESS.md.
      When the user types 'continue' (or starts a new session): read PROGRESS.md, find the exact phase and step marked DOING NOW, and resume that step. Never restart from phase 1, never redo finished steps, never ask questions. Keep building until all phases are done.
      Update PROGRESS.md after every finished step."
     Also add the working rules from this HOW TO WORK section.
  2. SPEC.md: copy this whole prompt into it, word for word.
- PROGRESS.md: create it with every phase below split into small steps (5-10 per phase), each marked TODO / DOING NOW / DONE. Save it after EVERY finished step (not only at the end of a phase), so if my usage runs out in the middle, nothing is lost and you resume exactly there. Example: if you stop during phase 5 step 3, "continue" resumes phase 5 step 3. If you stop during phase 1, it resumes phase 1.
- Before starting each phase, print one line: "Starting phase X: <name>". After finishing it, print one line: "Phase X done. Next: phase Y." Then keep going without waiting. When my usage runs out, I'll see where you stopped.
- Keep chat messages very short. Spend tokens on code, not explanations.
- Write each file completely once. To change something, edit the file; don't rewrite whole files.
- Never guess library APIs. After installing a library, read its README and type definitions in node_modules before using it. This is critical for pawnote.
- Keep dependencies few and well known. Build exactly this spec, no extra features.
- At the end of each phase, run the TypeScript check + build (and the tests when they exist), fix all errors, then move straight on to the next phase.
- If something can't be done here (for example building a signed APK without Android Studio), prepare everything, write the exact steps for me in the README, and move on.

=== PRODUCTS ===
1. ProEd HTML: a PWA for iPhone users. It runs in Safari and is added with "Add to Home Screen". No App Store. Hosted by my server.
2. ProEd APK: Android, the same codebase as the HTML version, through Capacitor. I share the APK file myself (sideloading, no Play Store).
3. ProEd Admin APK: a separate Android app, only for me (the admin).
4. Server: a small Node.js backend used for access control, live data, hosting the PWA, and the Pronote relay.

=== STACK (fixed, don't change it) ===
- npm workspaces monorepo: /proed-app, /proed-admin, /server, /shared.
- Apps: React + TypeScript + Vite, Tailwind CSS, Lucide icons, Capacitor for Android.
- Pronote: the "pawnote" npm library (unofficial; check the latest version).
- Storage on the device: IndexedDB through idb-keyval; @capacitor/preferences (or a secure-storage plugin) for the Pronote session on Android.
- Server: Fastify + TypeScript + better-sqlite3 + @fastify/jwt + @fastify/rate-limit + otplib, with a Dockerfile.
- Live data: simple HTTP polling (no WebSockets).
- Admin chart: Recharts.
- Tests: Vitest.

=== DESIGN RULES (very important) ===
- ProEd must look like a real designer made it, not like a generic AI-generated app.
- NO emojis anywhere: UI, text, buttons, notifications, empty states, messages.
- Lucide icons only, used sparingly and consistently.
- Visual identity: one brand color (deep blue), a neutral gray scale, the Inter font, an 8px spacing grid, clear hierarchy, subtle borders instead of heavy shadows. No purple gradients, no glassmorphism, no big rounded cards with an icon in each.
- Text written like a person would: short, natural, few exclamation marks. UI in French and English (French by default).
- Light and dark mode.
- A simple "ProEd" text logo + an SVG mark, plus app icons for Android and the PWA.
- Put the design system (colors, fonts, components) in /shared, and use it in both ProEd and ProEd Admin.

=== PROED APP FEATURES (same on HTML and APK) ===
1. Login screen: search for the school or paste the Pronote URL, then username + password. Support the Pronote QR-code login if pawnote allows it. Save the session so the student doesn't have to log in every time. Add a log-out button.
2. Homework: fetch all upcoming homework with pawnote. Sort by due date, then subject. Show the subject, the description, the due date and any attachments.
3. Time estimate for each item (shown as "about 45 min"):
   - Simple rules based on subject, description length and type of work (exercise / revision for a test / reading / project).
   - The student can edit the estimate.
   - A start/stop timer saves the real time spent. The average real time per subject adjusts future estimates.
4. Today view: "Today: 4 assignments, about 2 h 30", with a suggested order (closest due date first, then shortest).
5. Mark items as done, pull to refresh, settings screen (language, theme, log out).
6. Local first: homework, timers and settings stay on the device. The app works offline with cached homework. Service worker for the PWA.
7. CORS: browsers block direct requests to Pronote.
   - The APK uses CapacitorHttp to call Pronote directly (no relay).
   - The HTML/PWA version goes through the server relay at /relay.
   - The relay must never store or log request bodies, passwords or tokens. HTTPS only.

=== ACCESS CONTROL (only people I approve can use ProEd) ===
- I create an invite code for each student in ProEd Admin.
- On first launch, the student enters their invite code.
- POST /api/check sends the invite code + a random device ID + a SHA-256 hash of the Pronote username. Never the password, never the homework.
- The server answers with a signed JWT containing: allowed, channel (normal/beta), system state, message, feature flags, minimum version, latest APK version + download URL.
- Not allowed or blocked -> lock screen: "Access not authorized."
- Server unreachable -> use the last valid JWT for up to 72 h (configurable), then lock.
- The check runs at every app start and every 15 minutes while the app is open.
- System states (one global switch):
  - ACTIVE: normal.
  - RECOVERY: cached homework only, no Pronote calls, a banner with my message.
  - SHUTDOWN: the app is fully locked and shows my message.
- Feature flags: on for everyone, beta only, or off.
- Updates: app version below the minimum -> blocking update screen; below the latest -> optional banner with the APK download link (Android only).
- Live presence: while the app is open, POST /api/heartbeat every 60 s (device type: iPhone PWA or Android APK, app version). A user counts as online if seen in the last 2 minutes.

=== PROED ADMIN APK + ADMIN API ===
- Admin login: password + TOTP 2FA. A server setup script creates the single admin account (and shows the 2FA QR code) plus the first invite code.
- Dashboard / data section (refreshes every 10 s):
  - online now (live list: name or code, device, version, how long ago seen);
  - total users, active today, active this week;
  - a chart of daily active users over the last 30 days;
  - recent check-ins and failed access attempts.
- Users: list, search, open details (last seen, device, version, channel, created date), block/unblock, delete, create invite codes (with an optional label like a first name).
- Beta program: move users between normal and beta; manage feature flags.
- System controls: the ACTIVE / RECOVERY / SHUTDOWN switch with a message, minimum version, upload a new ProEd APK (served for download).
- Audit log of every admin action.
- Privacy: store only access data. No homework, no grades, no passwords.
- Security: admin routes separated and protected by an admin JWT, rate limiting on all routes, secrets in a .env file (with a .env.example), never log secrets.

=== PHASES (do them all, in order, without stopping) ===
1. Setup: CLAUDE.md, SPEC.md, PROGRESS.md, monorepo, configs, the shared design system, logo and icons.
2. ProEd app core: login, homework, estimates, timer, today view, done state, settings, offline cache, service worker, FR/EN, dark mode.
3. Server part 1: Fastify setup, the Pronote relay, hosting the PWA build.
4. Capacitor Android setup for proed-app (CapacitorHttp, icons, app name "ProEd").
5. Server part 2: database, invite codes, /api/check with JWT, /api/heartbeat, system states, flags, version info, rate limiting, the setup script.
6. ProEd app integration: invite-code screen, access check, grace period, lock/recovery/shutdown screens, heartbeat, update screen/banner.
7. ProEd Admin: the full app as described + the admin API routes + the Capacitor Android setup (app name "ProEd Admin").
8. Tests with Vitest: time estimates, access check logic, presence logic.
9. Docs: a README for a beginner with:
   - how to run everything locally;
   - how to build debug and signed release APKs for both apps, and how to keep the keystore safe;
   - how to deploy the server + PWA with HTTPS on a cheap or free host (recommend one);
   - a short guide for students: installing the APK on Android, adding ProEd to the iPhone home screen.
10. Final check: build every package, run the tests, search the code for emojis and remove any, make sure no secrets are committed, update PROGRESS.md to "complete", and end with a short checklist of what I must do myself.

In plus, send me all the virtual machine builds videos so I can see it.
