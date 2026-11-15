#!/usr/bin/env bash
# Usage: scripts/step.sh <done-step> [<next-step>]  e.g. scripts/step.sh 1.3 1.4
set -e
cd "$(dirname "$0")/.."
sed -i "s/^- \[DOING NOW\] $1 /- [DONE] $1 /; s/^- \[TODO\] $1 /- [DONE] $1 /" PROGRESS.md
if [ -n "$2" ]; then sed -i "s/^- \[TODO\] $2 /- [DOING NOW] $2 /" PROGRESS.md; fi
grep -n "DOING NOW" PROGRESS.md | grep -v Legend || true
