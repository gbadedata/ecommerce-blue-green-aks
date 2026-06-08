#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
HOST_HEADER="${2:-ecommerce.local}"
DURATION_SECONDS="${3:-60}"

failures=0
requests=0
end_time=$((SECONDS + DURATION_SECONDS))

echo "Starting zero-downtime test"
echo "BASE_URL=$BASE_URL"
echo "HOST_HEADER=$HOST_HEADER"
echo "DURATION_SECONDS=$DURATION_SECONDS"
echo

while [ "$SECONDS" -lt "$end_time" ]; do
  response_file="/tmp/ecommerce-version-response.txt"

  status=$(curl -s \
    -H "Host: $HOST_HEADER" \
    -o "$response_file" \
    -w "%{http_code}" \
    "$BASE_URL/api/v1/version" || echo "000")

  requests=$((requests + 1))

  if [ "$status" != "200" ]; then
    failures=$((failures + 1))
    echo "FAILED status=$status"
  else
    body=$(cat "$response_file")
    echo "OK status=$status body=$body"
  fi

  sleep 1
done

echo
echo "Total requests: $requests"
echo "Failed requests: $failures"

if [ "$failures" -ne 0 ]; then
  exit 1
fi
