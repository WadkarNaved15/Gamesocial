#!/bin/bash
set -e

echo "Loading environment variables..."

cd /home/ubuntu/Rigzer/server

aws ssm get-parameter \
  --region us-east-1 \
  --name "/rigzer/prod/env" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text > .env

chown ubuntu:ubuntu .env

echo "Starting workers..."

sudo -u ubuntu pm2 start \
  /home/ubuntu/Rigzer/workers/ecosystem.workers.config.cjs

sudo -u ubuntu pm2 save

echo "Workers started successfully"