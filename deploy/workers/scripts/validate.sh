#!/bin/bash
set -e

echo "Validating workers..."

pm2 describe game-worker >/dev/null
pm2 describe notification-worker >/dev/null
pm2 describe view-worker >/dev/null

echo "All workers are running"