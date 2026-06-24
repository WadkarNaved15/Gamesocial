#!/bin/bash
set -e

nginx -t
systemctl restart nginx

cd /home/ubuntu/Rigzer/server

sudo -u ubuntu pm2 reload index || \
sudo -u ubuntu pm2 start index.js --name index

sudo -u ubuntu pm2 save