#!/bin/bash
# Start a single service in the background, properly detached.
# Usage: ./scripts/start-one.sh <app-dir> <entry>
set -e
APP_DIR="$1"
ENTRY="$2"
LOG="${3:-/tmp/$APP_DIR.log}"

cd /home/user/besonc-workspace

# Spawn detached, write to log, redirect stdin
nohup ./node_modules/.bin/ts-node --transpile-only -r tsconfig-paths/register \
  -P apps/$APP_DIR/tsconfig.json $ENTRY \
  > $LOG 2>&1 < /dev/null &
PID=$!
disown $PID 2>/dev/null || true
echo "Started $APP_DIR pid=$PID log=$LOG"
