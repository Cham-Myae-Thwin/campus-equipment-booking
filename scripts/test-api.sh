#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8787}"
timestamp="$(date +%s)"

request() {
  local label="$1"
  shift
  printf '\n=== %s ===\n' "$label"
  curl --silent --show-error --write-out '\nHTTP %{http_code}\n' "$@"
}

request "1. list equipment (200)" "$BASE_URL/equipment"

created="$(curl --silent --fail-with-body --request POST "$BASE_URL/bookings" \
  --header 'Content-Type: application/json' \
  --data "{\"equipmentId\":\"eq-1\",\"borrowerName\":\"Test Borrower\",\"startAt\":\"2030-10-20T09:00:00.000Z\",\"endAt\":\"2030-10-20T11:00:00.000Z\",\"purpose\":\"Evidence $timestamp\"}")"
booking_id="$(printf '%s' "$created" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
printf '\n=== 2. create booking (201) ===\n%s\nHTTP 201\n' "$created"

request "3. list bookings (200)" "$BASE_URL/bookings/"
request "4. conflicting booking (409)" --request POST "$BASE_URL/bookings" \
  --header 'Content-Type: application/json' \
  --data '{"equipmentId":"eq-1","borrowerName":"Conflict User","startAt":"2030-10-20T10:00:00.000Z","endAt":"2030-10-20T12:00:00.000Z","purpose":"Conflict test"}'
request "5. invalid time (400)" --request POST "$BASE_URL/bookings" \
  --header 'Content-Type: application/json' \
  --data '{"equipmentId":"eq-2","borrowerName":"Invalid User","startAt":"2030-10-20T12:00:00.000Z","endAt":"2030-10-20T11:00:00.000Z","purpose":"Validation test"}'
request "6. get booking (200)" "$BASE_URL/bookings/$booking_id"
request "7. update booking (200)" --request PATCH "$BASE_URL/bookings/$booking_id" \
  --header 'Content-Type: application/json' \
  --data '{"equipmentId":"eq-2","borrowerName":"Updated Borrower","startAt":"2030-10-21T09:00:00.000Z","endAt":"2030-10-21T10:00:00.000Z","purpose":"Updated purpose"}'
request "8. delete booking (204)" --request DELETE "$BASE_URL/bookings/$booking_id"
request "9. missing booking (404)" "$BASE_URL/bookings/$booking_id"