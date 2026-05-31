#!/bin/bash
set -e

nginx -t
systemctl restart nginx

cd /home/ubuntu/Rigzer/server
pm2 reload index || pm2 start index.js --name index
pm2 save