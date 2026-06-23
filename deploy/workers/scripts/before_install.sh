#!/bin/bash
set -e

echo "Stopping existing workers..."

sudo -u ubuntu pm2 delete game-worker || true
sudo -u ubuntu pm2 delete notification-worker || true
sudo -u ubuntu pm2 delete view-worker || true