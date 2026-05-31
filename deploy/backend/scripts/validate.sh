#!/bin/bash
set -e

for i in {1..30}; do
  if curl -fsS http://127.0.0.1:5000/health; then
    exit 0
  fi
  sleep 2
done

exit 1