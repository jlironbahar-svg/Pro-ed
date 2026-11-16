# ProEd

ProEd turns Pronote homework into a simple plan: what is due, how long it should take, and what to do first today.

This repository holds four things:

| Folder | What it is |
| --- | --- |
| `proed-app/` | **ProEd**, the student app. Runs as a PWA on iPhone (Safari, "Add to Home Screen") and as an Android APK (Capacitor). Same code. |
| `proed-admin/` | **ProEd Admin**, your private Android app (also works in a browser) to manage access, see live data and control the system. |
| `server/` | Small Node.js server (Fastify + SQLite): access control, live data, admin API, Pronote relay for the PWA, and hosting of the PWA. |
| `shared/` | Design system (colors, Inter font, components, logo) and shared types used by everything above. |

### Your links

Once the server is deployed (section 3), everything lives at one address, for example `https://proed-lycee-moliere.fly.dev`:

| What | Link |
| --- | --- |
| ProEd for iPhone (PWA, "Add to Home Screen") | `https://<your-app>.fly.dev` |
| ProEd APK download for Android | `https://<your-app>.fly.dev/download/proed.apk` (works after you upload the APK in ProEd Admin > System) |
| ProEd Admin in a browser | `https://<your-app>.fly.dev/console/` |
| ProEd Admin APK | from the GitHub Actions run (section 2, option B) or Android Studio; enter your server address on its login screen |

### No server at all: the two APKs alone (free)

The APKs published on GitHub run in **serverless mode**. ProEd Admin saves invite codes, blocks, beta, features and the ProEd status in `proed-config.json` in this repository. ProEd reads that file and talks to Pronote directly. You run nothing yourself.

- Students' first names and plain invite codes never go to GitHub: they stay on your phone. The file only holds slow hashes of the codes.
- Changes reach students' phones within about 5 minutes.
- Live data (who is online, activity, refused attempts) and the iPhone version need the ProEd server (section 3).

1. On your Android phone, download and install both APKs:
   - ProEd Admin: <https://github.com/jlironbahar-svg/Pro-ed/releases/download/apk-latest/ProEd-Admin.apk>
   - ProEd: <https://github.com/jlironbahar-svg/Pro-ed/releases/download/apk-latest/ProEd.apk>

   If Android asks, allow your browser to install unknown apps.
2. Create a GitHub token for ProEd Admin (once):
   1. Open this link in Chrome (not in the GitHub app) and sign in: <https://github.com/settings/personal-access-tokens/new?name=ProEd%20Admin&description=ProEd%20Admin%20app&expires_in=365&contents=write>. On a phone, if parts of the page are missing, choose Chrome menu > **Desktop site**.
   2. Check the name is `ProEd Admin`. Expiration: the longest offered.
   3. **Repository access**: Only select repositories > `Pro-ed`.
   4. **Permissions**: **Contents** must say **Read and write** (if it is missing, add the Contents permission and choose Read and write).
   5. Click **Generate token** and copy it.
3. Open ProEd Admin. The repository is already filled in (`jlironbahar-svg/Pro-ed`). Paste the token and sign in.
4. In **Utilisateurs**, tap **+** to create one invite code per student, including one for yourself.
5. Give each student the ProEd link and their code. They open ProEd, enter the code, then sign in with Pronote.

Keep the token private: anyone who has it can change the access file. If it leaks, delete it on GitHub and create a new one.

Contents

1. [Run everything locally](#1-run-everything-locally)
2. [Build the Android APKs](#2-build-the-android-apks)
3. [Deploy the server and the PWA with HTTPS](#3-deploy-the-server-and-the-pwa-with-https)
4. [Guide for students](#4-guide-for-students)
5. [Using ProEd Admin](#5-using-proed-admin)
6. [Privacy and security](#6-privacy-and-security)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Run everything locally

### What you need

- **Node.js 22** or newer: <https://nodejs.org> (take the LTS version). Check with `node -v`.
- **Git**: <https://git-scm.com>.
- A terminal (Terminal on macOS, PowerShell on Windows).

### First time

```bash
git clone https://github.com/jlironbahar-svg/Pro-ed.git
cd Pro-ed
npm install
```

`npm install` installs every package of the monorepo and builds `shared/`.

### Set up the server (once)

```bash
npm run setup -w proed-server
```

This script:

1. creates `server/.env` with new secrets (admin JWT secret and the ES256 key pair for access tokens),
2. creates the **single admin account**: it prints a random password and a **QR code** to scan with an authenticator app (Google Authenticator, Aegis, 2FAS...),
3. creates the **first invite code** (for you).

Write down the password and the invite code. To start over with a new admin password and 2FA: `npm run setup -w proed-server -- --reset-admin`.

For local testing, open `server/.env` and change two lines:

```
PUBLIC_URL=http://localhost:8787
FORCE_HTTPS=false
```

### Start it

Open three terminals in the `Pro-ed` folder:

```bash
npm run dev:server   # API + relay on http://localhost:8787
npm run dev:app      # student app on http://localhost:5173
npm run dev:admin    # admin app on http://localhost:5174
```

- Student app: open <http://localhost:5173>, enter your invite code, then sign in with a Pronote account.
- Admin app: open <http://localhost:5174>, leave **Server address** empty (the dev server forwards to 8787), type the password and the 6-digit code from your authenticator app.

To test the PWA exactly like in production (served by the server, with the service worker):

```bash
npm run build -w proed-app
npm run dev:server
# open http://localhost:8787
```

### Useful commands

```bash
npm test            # all tests (Vitest)
npm run typecheck   # TypeScript check of every package
npm run build       # build every package
```

---

## 2. Build the Android APKs

There are two APKs: **ProEd** (`proed-app`, package `app.proed.student`) and **ProEd Admin** (`proed-admin`, package `app.proed.admin`). Everything below works the same for both: replace `proed-app` with `proed-admin`.

### Option A: on your computer

1. Install **Android Studio**: <https://developer.android.com/studio>. Open it once and let it install the Android SDK. It ships with the right Java version.
2. Tell the build where the SDK is (only if `gradlew` complains): set the `ANDROID_HOME` environment variable to the SDK path shown in Android Studio (Settings > Languages & Frameworks > Android SDK).
3. Tell the app where your server is:

   ```bash
   cp proed-app/.env.android.example proed-app/.env.android
   # then edit proed-app/.env.android:
   # VITE_SERVER_URL=https://your-app.fly.dev
   ```

   For ProEd Admin, the same file only sets the default server address shown on the login screen (you can change it there).

#### Debug APK (for testing)

```bash
npm run android:debug -w proed-app
```

The APK is in `proed-app/android/app/build/outputs/apk/debug/app-debug.apk`. You can also open the project in Android Studio with `npm run android:open -w proed-app` and press Run with a phone plugged in.

#### Signed release APK (the one you share)

1. Create a keystore **once per app**, and keep it outside the repository:

   ```bash
   mkdir -p ~/proed-keys
   keytool -genkeypair -v -keystore ~/proed-keys/proed-release.jks -alias proed \
     -keyalg RSA -keysize 4096 -validity 10000
   ```

   (`keytool` comes with Android Studio: `<Android Studio>/jbr/bin/keytool` if it is not in your PATH.) For the admin app, use `proed-admin-release.jks` and alias `proed-admin`.

2. Copy `proed-app/android/keystore.properties.example` to `proed-app/android/keystore.properties` and fill in the absolute path and passwords.
3. Build:

   ```bash
   npm run android:release -w proed-app
   ```

   The APK is in `proed-app/android/app/build/outputs/apk/release/app-release.apk`.

#### Keep the keystore safe

- **If you lose the keystore or its password, you can never update ProEd again**: Android refuses an update signed with another key, so every student would have to uninstall and reinstall.
- Keep two copies in different places (for example a USB key and an encrypted cloud folder) and the passwords in a password manager.
- Never commit it. `.gitignore` already ignores `*.jks`, `*.keystore` and `keystore.properties`.
- Never send it to anyone. Students only need the `.apk`.

#### Releasing a new version

1. Raise `"version"` in `proed-app/package.json` (for example `1.0.0` to `1.1.0`). The Android version code is computed from it.
2. Build the release APK.
3. In ProEd Admin > System, upload the APK with the same version number. Students with an older APK see a banner with the download link.
4. If the old version must stop working, set **Minimum version** to the new version: older apps then show a blocking update screen.

The iPhone PWA updates itself: deploy the server again and the new version loads the next time the app opens.

### Option B: on GitHub, without Android Studio

The workflow `.github/workflows/android.yml` builds both APKs in the cloud.

1. On GitHub: **Settings > Secrets and variables > Actions > Variables**, add `PROED_SERVER_URL` (your server address).
2. **Actions** tab > **Android APKs** > **Run workflow**.
3. When it finishes, download the APKs from the run page (Artifacts).

For signed release APKs, also add these **secrets**: `PROED_KEYSTORE_BASE64` (the keystore file encoded with `base64 -w0 proed-release.jks`), `PROED_KEYSTORE_PASSWORD`, `PROED_KEY_ALIAS`, `PROED_KEY_PASSWORD`, and the same four with the `PROED_ADMIN_` prefix for the admin app.

---

## 3. Deploy the server and the PWA with HTTPS

**No money?** Use the [free option](#free-option-0-eur-no-card-your-own-computer--tailscale-funnel) below.

**Recommended paid host: [Fly.io](https://fly.io).** It runs the Docker image of this repo, gives you HTTPS automatically on `https://<name>.fly.dev`, and keeps the SQLite database on a small volume. For one school, the smallest machine (256 MB) and a 1 GB volume cost about 2 EUR per month, and the machine sleeps when nobody uses the app. (Free hosts like Render's free plan lose the database on every restart, so they are not a good fit.)

The server also serves the PWA (the iPhone version), so one deployment covers both.

### Steps

1. Install the Fly command line tool: <https://fly.io/docs/flyctl/install/>, then sign up or log in:

   ```bash
   fly auth signup   # or: fly auth login
   ```

2. Generate the secrets on your computer (if you have not run the setup yet):

   ```bash
   npm run setup -w proed-server -- --secrets-only
   ```

3. `fly.toml` already names the app `proed-jlb`, so your address will be `https://proed-jlb.fly.dev`, and the APKs published on GitHub are built for that address. Keep it. If Fly says the name is taken, change it in `fly.toml`, then run the APK workflow again (section 2, option B). The commands below use `proed-lycee-moliere` as an example name: use yours.
4. Create the app and the volume (region `cdg` is Paris):

   ```bash
   fly apps create proed-lycee-moliere
   fly volumes create proed_data --region cdg --size 1 --app proed-lycee-moliere
   ```

5. Send the secrets (they are read from `server/.env`, never committed):

   ```bash
   grep -E '^(ADMIN_JWT_SECRET|ACCESS_PRIVATE_KEY|ACCESS_PUBLIC_KEY)=' server/.env | fly secrets import
   fly secrets set PUBLIC_URL=https://proed-lycee-moliere.fly.dev
   ```

6. Deploy:

   ```bash
   fly deploy
   ```

7. Create the admin account and the first invite code **on the server** (the database lives there):

   ```bash
   fly ssh console -C "setpriv --reuid=node --regid=node --init-groups node server/dist/setup.js"
   ```

   Scan the QR code with your authenticator app and write down the password and the invite code.

8. Check it: open `https://proed-lycee-moliere.fly.dev`. You should see the invite-code screen.

To update later: `git pull` (or your changes), then `fly deploy`. Logs: `fly logs`.

Optional: use your own domain with `fly certs add proed.example.com` and follow the DNS instructions it prints. Update `PUBLIC_URL` and rebuild the APKs with the new address.

### Free option (0 EUR): an old Android phone as the server

An old Android phone (Android 7 or newer, for example a Nexus 6) can run the ProEd server at home on your Wi-Fi. A free [ngrok](https://ngrok.com) account gives it a fixed public HTTPS address.

This brings back everything that needs a server:
- the iPhone version;
- live data (who is online, the activity chart);
- admin login with a password and 2FA (no GitHub token);
- the APK download page.

The server runs in **open access**: no invite codes. Every phone that opens ProEd appears in ProEd Admin, where you can name it, move it between beta and normal, or block it.

1. **ngrok account (free, no card).**
   1. Sign up at <https://dashboard.ngrok.com/signup>.
   2. Copy your **authtoken** (dashboard > Your Authtoken).
   3. Create your free domain (dashboard > Domains > New Domain). It looks like `something.ngrok-free.app`.
2. **Termux on the old phone.**
   1. Install Termux from F-Droid (<https://f-droid.org/packages/com.termux/>), or from <https://github.com/termux/termux-app/releases>. On a Nexus 6, take the file ending in `armeabi-v7a.apk`.
   2. Open it once.
   **Faster, from a Windows PC over USB:** on the phone, turn on Developer options > USB debugging and plug it into the PC. Open PowerShell on the PC and paste the line below. It downloads ADB, installs Termux and ProEd on the phone, shows your admin password and starts the server. Steps 3 and 4 below are then already done.

   ```
   irm https://raw.githubusercontent.com/jlironbahar-svg/Pro-ed/HEAD/deploy/phone/setup-from-windows.ps1 | iex
   ```

3. **Install ProEd.** In Termux, type:

   ```
   curl -fsSL https://raw.githubusercontent.com/jlironbahar-svg/Pro-ed/HEAD/deploy/phone/install.sh | bash
   ```

   Paste the authtoken and type the domain when asked. At the end, write down the **admin password** and scan the **QR code** with an authenticator app.
4. **Start it:** `proed-start`. It prints your address and whether it is online. Stop it with `proed-stop`.
5. **Keep it running.**
   - Leave the phone charging and on Wi-Fi.
   - In Android settings, turn off battery optimization for Termux.
   - After the phone restarts, open Termux and type `proed-start` again.
6. **Point the apps to it.** Put `https://<your-domain>` on the first line of the `SERVER_URL` file in the repository (or ask Claude to do it), then run the **Android APKs** workflow. The rebuilt APKs talk to your phone. The download links stay the same.

Your links:
- iPhone (Safari, then Share > Add to Home Screen): `https://<your-domain>`
- Admin in a browser: `https://<your-domain>/console/`
- APKs: the GitHub release links.

On the free plan, ngrok shows a short warning page the first time a browser opens the address: tap **Visit Site** once. The apps are not affected.

On Android, ngrok cannot download its certificate revocation list, so the phone setup turns that check off (`crl_noverify: true` in `~/proed/ngrok.yml`). The risk is small but real: if ngrok's own certificate were ever stolen and revoked, someone could intercept traffic through your address. Remove that line if you move the server to a regular computer.

To update the server later, run the same `curl ... | bash` command again. It keeps your settings, admin account and data.

### Free option (0 EUR, no card): your own computer + Tailscale Funnel

The server runs on your own computer. [Tailscale Funnel](https://tailscale.com/kb/1223/tailscale-funnel) (free personal plan, no card) gives it a fixed public HTTPS address like `https://my-pc.tail1234.ts.net`.

Trade-off: students can reach the server only while your computer is on and awake. When it is off:
- Android students keep working: their access stays valid for 72 h, and the APK talks to Pronote directly.
- iPhone students still see their saved homework, but can't refresh it until the computer is back on.

1. Install Node.js LTS from <https://nodejs.org> and download this repository (green **Code** button, **Download ZIP**, unzip).
2. Open a terminal in the folder and run:

   ```
   npm install
   npm run build
   npm run setup -w proed-server
   ```

   Write down the admin password, scan the QR code with an authenticator app, and note the invite code.

3. Install Tailscale from <https://tailscale.com/download> and sign in with a Google, Microsoft, GitHub or Apple account. On a Mac, also choose **Install CLI** in the Tailscale menu (settings).
4. Start the public address:

   ```
   tailscale funnel --bg 8787
   ```

   The first time, it prints a link to turn on Funnel: open it and approve. Then it prints your address, `https://<computer>.<tailnet>.ts.net`. Run `tailscale funnel status` to see it again.
5. Open `server/.env` in a text editor and set:

   ```
   PUBLIC_URL=https://<computer>.<tailnet>.ts.net
   FORCE_HTTPS=false
   ```

6. Start the server and leave this terminal open:

   ```
   npm run start -w proed-server
   ```

7. Stop the computer from going to sleep while plugged in:
   - Windows: Settings > System > Power > Sleep: Never.
   - Mac: System Settings > Battery > Options: prevent automatic sleeping on power adapter.
8. Build the APKs for your address: put the address on the first line of the `SERVER_URL` file at the root of the repository on GitHub (or set the `PROED_SERVER_URL` variable), then run the **Android APKs** workflow. The APK links stay the same.

Your links: the iPhone app is `https://<computer>.<tailnet>.ts.net`, the admin is `.../console/`. The APKs are always downloadable from the GitHub release links, even when your computer is off.

After restarting the computer, start the server again with `npm run start -w proed-server`. Funnel restarts by itself.

### Other hosts

Any host that runs a Docker image with a persistent disk works (Railway, a VPS with Docker and [Caddy](https://caddyserver.com) for HTTPS, Oracle Cloud's free VM...):

```bash
docker build -t proed .
docker run -d -p 8787:8787 --env-file server/.env -v proed-data:/data proed
docker exec -it <container> setpriv --reuid=node --regid=node --init-groups node server/dist/setup.js
```

Always put HTTPS in front of it, keep `FORCE_HTTPS=true` and `TRUST_PROXY=true`.

### Server settings

All settings are in `server/.env.example`, with comments. The important ones:

| Variable | Meaning |
| --- | --- |
| `PUBLIC_URL` | Public HTTPS address (used for the APK download link). |
| `ACCESS_GRACE_HOURS` | How long the app keeps working when it can't reach the server (default 72). |
| `RELAY_EXTRA_HOSTS` | Extra Pronote hosts if your school is not on `*.index-education.net`. |
| `CORS_ORIGINS` | Origins allowed to call the API (the Android apps use `https://localhost`). |
| `TIME_ZONE` | Time zone for the daily statistics (default `Europe/Paris`). |

---

## 4. Guide for students

> Copy this part and send it to the students.

### Français

**Tu as reçu un code d'invitation ProEd.** Il te sert à la première ouverture de l'app.

**Sur Android**

1. Ouvre le lien de téléchargement que tu as reçu (ou le fichier `ProEd.apk`).
2. Si Android le demande, autorise ton navigateur (ou l'app Fichiers) à « installer des applications inconnues », puis reviens en arrière.
3. Touche **Installer**, puis **Ouvrir**.
4. Entre ton code d'invitation, cherche ton établissement, puis connecte-toi avec tes identifiants Pronote.

**Sur iPhone**

1. Ouvre le lien ProEd dans **Safari** (pas dans une autre app).
2. Touche le bouton **Partager** (le carré avec une flèche), puis **Sur l'écran d'accueil**, puis **Ajouter**.
3. Ouvre ProEd depuis l'icône sur ton écran d'accueil.
4. Entre ton code d'invitation, cherche ton établissement, puis connecte-toi avec tes identifiants Pronote.

Ton mot de passe Pronote reste sur ton téléphone : il n'est jamais envoyé au serveur ProEd. Si ton établissement utilise un ENT, choisis « Se connecter avec un QR code » et suis les étapes affichées.

### English

**You received a ProEd invite code.** You need it the first time you open the app.

**Android**

1. Open the download link you received (or the `ProEd.apk` file).
2. If Android asks, allow your browser (or Files app) to "install unknown apps", then go back.
3. Tap **Install**, then **Open**.
4. Enter your invite code, find your school, then sign in with your Pronote login.

**iPhone**

1. Open the ProEd link in **Safari** (not in another app).
2. Tap **Share** (the square with an arrow), then **Add to Home Screen**, then **Add**.
3. Open ProEd from the icon on your home screen.
4. Enter your invite code, find your school, then sign in with your Pronote login.

Your Pronote password stays on your phone and is never sent to the ProEd server. If your school signs in through an ENT, choose "Sign in with a QR code" and follow the steps.

---

## 5. Using ProEd Admin

Install the admin APK on your phone (section 2), or open `https://<your-app>.fly.dev/console/` in any browser. Sign in with the server address, your password and the 6-digit 2FA code.

- **Data**: who is online right now (refreshes every 10 s), total users, active today and this week, a chart of daily active users over 30 days, recent check-ins and refused attempts.
- **Users**: search, open a user (last seen, device, version, channel, created date), block or unblock, delete, and create invite codes with an optional first name. Give each student their own code. A code becomes tied to the first Pronote account that uses it, so it can't be shared.
- **Beta**: move users between normal and beta, and set each feature to "Everyone", "Beta" or "Off".
- **System**: the global switch.
  - **Active**: normal.
  - **Limited** (recovery): the app only shows saved homework, never calls Pronote, and shows your message in a banner.
  - **Closed** (shutdown): the app is locked and shows your message.
  - Also: the minimum version and the APK upload.
- **Log**: every admin action, with date and time.
- **Settings**: language, theme, log out (closes every admin session).

Changes reach open apps within about a minute (the heartbeat asks them to check again).

---

## 6. Privacy and security

- **Pronote password**: never leaves the device. ProEd keeps only the Pronote session token, in app-private storage (Capacitor Preferences on Android, IndexedDB on iPhone). Android backups are disabled so the token is not copied to the cloud.
- **Homework, timers, settings**: stay on the device (IndexedDB). The server never receives them.
- **Access check** (`POST /api/check`): sends only the invite code, a random device ID, a SHA-256 hash of the Pronote username, the device type and the app version. The server rejects any other field.
- **Server database**: access data only (invite codes, labels, devices, last seen, daily activity, events kept 90 days, admin audit log). No homework, no grades, no passwords.
- **Access tokens**: signed with ES256. The app verifies the signature itself, so a token edited on the phone is rejected. When the server can't be reached, the last valid token keeps working until it expires (72 h by default), then the app locks.
- **Pronote relay** (`/relay`, PWA only): forwards requests to HTTPS Pronote hosts only (`*.index-education.net`, `www.index-education.com`, plus `RELAY_EXTRA_HOSTS`), never logs or stores bodies, passwords or tokens. The Android app calls Pronote directly with native HTTP and doesn't use the relay.
- **Admin**: password (scrypt) + TOTP 2FA with replay protection, separate admin JWT, sessions revoked on log out, rate limiting on every route (stricter on login), secrets only in `server/.env` (never committed, never logged).

ProEd uses [@blockshub/pawnote-lts](https://github.com/BlocksHub/Pawnote-LTS), the maintained fork of the unofficial Pronote library pawnote (the original is archived and does not work with Pronote 2026). ProEd is not affiliated with Index Education.

---

## 7. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Missing secrets` when the server starts | Run `npm run setup -w proed-server` (locally) or set the secrets on the host (section 3). |
| Invite screen says the server can't be reached | Check `VITE_SERVER_URL` in `.env.android` (APK), that the server is up (`/healthz`), and `CORS_ORIGINS`. |
| "Couldn't reach this Pronote server" on the PWA | Your school may use its own domain: add it to `RELAY_EXTRA_HOSTS`. |
| Login works on Pronote but not in ProEd | If the school uses an ENT, use the QR code login. If the account asks for a security setup, finish it once on the Pronote website. |
| Admin login refused although the code is right | The phone's clock must be on automatic time. Each 2FA code works only once. |
| `SDK location not found` when building an APK | Set `ANDROID_HOME` or create `android/local.properties` with `sdk.dir=/path/to/Android/sdk`. |
| Lost the admin password or 2FA | Run the setup again with `--reset-admin` (locally, or with `fly ssh console` on the server). |
