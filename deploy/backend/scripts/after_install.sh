#!/bin/bash
set -e

cd /home/ubuntu/Rigzer/server
npm install --omit=dev

mkdir -p /etc/nginx/sites-available
cp /home/ubuntu/Rigzer/nginx/rigzer-backend.conf /etc/nginx/sites-available/default