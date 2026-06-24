#!/bin/bash
set -e

nginx -t
systemctl restart nginx

cd /home/ubuntu/Rigzer/server

echo "Loading environment variables from SSM..."

aws ssm get-parameter \
  --region us-east-1 \
  --name "/rigzer/prod/env" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text > .env

chown ubuntu:ubuntu .env
chmod 600 .env

sudo -u ubuntu pm2 reload index || \
sudo -u ubuntu pm2 start index.js --name index

sudo -u ubuntu pm2 save