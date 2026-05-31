#!/bin/bash
set -e

# Stop any old stack only if the folder already exists
if [ -d /home/ubuntu/gorse ]; then
  cd /home/ubuntu/gorse
  docker compose down || true
fi

exit 0