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

echo "Starting workers..."

pm2 start /home/ubuntu/Rigzer/workers/ecosystem.workers.config.cjs

pm2 save

echo "Workers started successfully"