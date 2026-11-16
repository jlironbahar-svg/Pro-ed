#!/data/data/com.termux/files/usr/bin/bash
# ProEd server on an Android phone (Termux). Run in Termux:
#   curl -fsSL https://raw.githubusercontent.com/jlironbahar-svg/Pro-ed/HEAD/deploy/phone/install.sh | bash
# Running it again updates ProEd and keeps your settings, admin account and data.
# Optional: NGROK_TOKEN and NGROK_DOMAIN in the environment skip the questions (used by setup-from-windows.ps1).
set -e
export DEBIAN_FRONTEND=noninteractive
REPO="jlironbahar-svg/Pro-ed"
DIR="$HOME/proed"
ZIP_URL="https://github.com/$REPO/releases/download/apk-latest/ProEd-Server.zip"

echo "== 1/5 Termux packages (Node.js, unzip, proot)"
# Never stop on "keep or replace this config file?" questions.
mkdir -p "$PREFIX/etc/apt/apt.conf.d"
printf 'Dpkg::Options { "--force-confdef"; "--force-confold"; };\n' > "$PREFIX/etc/apt/apt.conf.d/99proed"
pkg update -y
pkg install -y nodejs-lts curl unzip proot
node -e "require('node:sqlite')" 2>/dev/null || { echo "This Node.js has no node:sqlite. Try: pkg install nodejs"; exit 1; }

echo "== 2/5 Downloading the ProEd server"
TMP="$PREFIX/tmp/proed-install"
rm -rf "$TMP" && mkdir -p "$TMP"
curl -fL -o "$TMP/proed.zip" "$ZIP_URL"
unzip -q "$TMP/proed.zip" -d "$TMP"
if [ -d "$DIR" ]; then
  # Keep settings, data and ngrok between updates.
  for keep in server/.env server/data ngrok ngrok.env; do
    if [ -e "$DIR/$keep" ]; then mkdir -p "$(dirname "$TMP/proed/$keep")"; rm -rf "$TMP/proed/$keep"; mv "$DIR/$keep" "$TMP/proed/$keep"; fi
  done
  rm -rf "$DIR"
fi
mv "$TMP/proed" "$DIR"
rm -rf "$TMP"

echo "== 3/5 ngrok (free fixed address)"
case "$(uname -m)" in
  aarch64|arm64) NARCH=arm64 ;;
  *) NARCH=arm ;;
esac
if [ ! -x "$DIR/ngrok" ]; then
  curl -fL -o "$DIR/ngrok.tgz" "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-$NARCH.tgz"
  tar -xzf "$DIR/ngrok.tgz" -C "$DIR" && rm -f "$DIR/ngrok.tgz"
fi
if [ ! -f "$DIR/ngrok.env" ] || [ -n "$NGROK_TOKEN" ]; then
  if [ -z "$NGROK_TOKEN" ]; then
    echo "Paste your ngrok authtoken (dashboard.ngrok.com > Your Authtoken), then press Enter:"
    read -r NGROK_TOKEN < /dev/tty
  fi
  if [ -z "$NGROK_DOMAIN" ]; then
    echo "Type your free ngrok domain (dashboard.ngrok.com > Domains), for example proed-xyz.ngrok-free.app:"
    read -r NGROK_DOMAIN < /dev/tty
  fi
  NGROK_DOMAIN="${NGROK_DOMAIN#https://}"; NGROK_DOMAIN="${NGROK_DOMAIN%/}"
  "$DIR/ngrok" config add-authtoken "$NGROK_TOKEN" >/dev/null
  echo "NGROK_DOMAIN=$NGROK_DOMAIN" > "$DIR/ngrok.env"
fi
. "$DIR/ngrok.env"

echo "== 4/5 Server settings and admin account"
cd "$DIR/server"
node --env-file-if-exists=.env dist/setup.js --secrets-only >/dev/null
setenv() { if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi; }
setenv PUBLIC_URL "https://$NGROK_DOMAIN"
setenv FORCE_HTTPS false
setenv TRUST_PROXY true
setenv OPEN_ACCESS true
setenv DATA_DIR "$DIR/server/data"
if [ "$PROED_SAVE_SETUP" = "1" ]; then
  # The Windows helper reads this once (admin password, 2FA key) and deletes it.
  umask 077
  node --env-file=.env dist/setup.js | tee "$DIR/setup-output.txt"
else
  node --env-file=.env dist/setup.js
fi

echo "== 5/5 Start command"
cp "$DIR/start.sh" "$PREFIX/bin/proed-start" && chmod +x "$PREFIX/bin/proed-start"
cp "$DIR/stop.sh" "$PREFIX/bin/proed-stop" && chmod +x "$PREFIX/bin/proed-stop"
echo
echo "Installed. Start ProEd with:  proed-start"
echo "Your address: https://$NGROK_DOMAIN   (admin: https://$NGROK_DOMAIN/console/)"
