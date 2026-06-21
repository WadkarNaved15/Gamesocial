#!/bin/bash
set -e

echo "Downloading GeoLite databases..."

mkdir -p /home/ubuntu/Rigzer/server/data

aws s3 sync \
s3://rigzer-backend-deployments-us/geoip \
/home/ubuntu/Rigzer/server/data

chown ubuntu:ubuntu \
/home/ubuntu/Rigzer/server/data/*.mmdb

echo "GeoLite databases downloaded successfully"