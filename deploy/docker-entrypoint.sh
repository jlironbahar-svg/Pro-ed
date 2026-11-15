#!/bin/sh
# Volumes (Fly.io, Docker) are mounted as root: give the data folder to the "node" user, then drop root.
set -e
mkdir -p "${DATA_DIR:-/data}"
chown -R node:node "${DATA_DIR:-/data}"
exec setpriv --reuid=node --regid=node --init-groups "$@"
