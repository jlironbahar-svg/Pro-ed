#!/data/data/com.termux/files/usr/bin/bash
# Starts the ProEd server and the ngrok tunnel in the background. Stop with: proed-stop
DIR="$HOME/proed"
. "$DIR/ngrok.env"
termux-wake-lock 2>/dev/null || true
pkill -f "dist/index.js" 2>/dev/null || true
pkill -f "ngrok http" 2>/dev/null || true
cd "$DIR/server"
nohup node --env-file=.env dist/index.js > "$DIR/server.log" 2>&1 &
sleep 4
# ngrok is a Linux program: on Android it finds no DNS servers (/etc/resolv.conf does not exist),
# and proot/termux-chroot crashes on old phones. So it runs directly, with DNS servers in its own config.
CFG="$DIR/ngrok.yml"
if [ ! -s "$CFG" ]; then
  DEFAULT_CFG=$("$DIR/ngrok" config check 2>/dev/null | sed -n 's/.* at \(\/.*\.yml\).*/\1/p' | head -n 1)
  TOKEN=$(grep -h -m 1 'authtoken:' "$DEFAULT_CFG" "$HOME/.config/ngrok/ngrok.yml" "$HOME/.ngrok2/ngrok.yml" 2>/dev/null | head -n 1 | awk '{print $2}')
  printf 'version: "2"\nauthtoken: %s\ncrl_noverify: true\ndns_resolver_ips:\n  - 1.1.1.1\n  - 8.8.8.8\n' "$TOKEN" > "$CFG"
  chmod 600 "$CFG"
fi
# User's choice (2026-11-16): ngrok's CRL download ignores dns_resolver_ips and fails on Android,
# so the revocation check is skipped (documented ngrok option; small risk, see README).
grep -q '^crl_noverify:' "$CFG" || echo 'crl_noverify: true' >> "$CFG"
SSL_CERT_FILE="$PREFIX/etc/tls/cert.pem" nohup "$DIR/ngrok" http 8787 --url="https://$NGROK_DOMAIN" --config "$CFG" --log=stdout > "$DIR/ngrok.log" 2>&1 &
sleep 8
echo "ProEd: https://$NGROK_DOMAIN"
if curl -s -m 15 -H "ngrok-skip-browser-warning: 1" "https://$NGROK_DOMAIN/healthz" | grep -q "\"ok\":true"; then
  echo "Online. Keep the phone charging and connected to Wi-Fi."
else
  echo "Not reachable yet. Last lines of the ngrok log (send a photo of this to Claude):"
  tail -n 12 "$DIR/ngrok.log"
fi
