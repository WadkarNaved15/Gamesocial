#!/bin/bash
set -e

echo "Validating workers..."

sudo -u ubuntu pm2 describe game-worker >/dev/null
sudo -u ubuntu pm2 describe notification-worker >/dev/null
sudo -u ubuntu pm2 describe view-worker >/dev/null

echo "All workers are running"