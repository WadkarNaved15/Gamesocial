#!/bin/bash
set -e

cd /home/ubuntu/gorse

# Start the Gorse stack
docker compose up -d --remove-orphans