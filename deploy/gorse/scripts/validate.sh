#!/bin/bash
set -e

for i in {1..30}; do
  if curl -fsS http://127.0.0.1:8087/api/health/ready; then
    exit 0
  fi
  sleep 2
done

echo "Gorse did not become ready in time"
exit 1