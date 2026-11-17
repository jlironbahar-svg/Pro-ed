#!/data/data/com.termux/files/usr/bin/bash
# Stops the ProEd server and the ngrok tunnel.
pkill -f "PROED_LOOP" 2>/dev/null || true
pkill -f "dist/index.js" 2>/dev/null || true
pkill -f "ngrok http" 2>/dev/null || true
termux-wake-unlock 2>/dev/null || true
echo "ProEd stopped."
