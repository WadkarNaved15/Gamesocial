#!/bin/bash
set -e

echo "Stopping existing workers..."

pm2 delete game-worker || true
pm2 delete notification-worker || true
pm2 delete view-worker || true