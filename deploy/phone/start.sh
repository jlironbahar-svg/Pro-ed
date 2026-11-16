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
# termux-chroot gives ngrok the /etc files (DNS) it expects on Linux.
SSL_CERT_FILE="$PREFIX/etc/tls/cert.pem" nohup termux-chroot "$DIR/ngrok" http 8787 --url="https://$NGROK_DOMAIN" --log=stdout > "$DIR/ngrok.log" 2>&1 &
sleep 8
echo "ProEd: https://$NGROK_DOMAIN"
if curl -s -m 15 -H "ngrok-skip-browser-warning: 1" "https://$NGROK_DOMAIN/healthz" | grep -q ok; then
  echo "Online. Keep the phone charging and connected to Wi-Fi."
else
  echo "Not reachable yet. Logs: $DIR/server.log and $DIR/ngrok.log"
fi
