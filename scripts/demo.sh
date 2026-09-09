#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

API_URL="http://127.0.0.1:3333"
WEB_URL="http://localhost:8081"
WEB_PORT="8081"
PIDS=()

cleanup() {
  echo ""
  echo "Stopping Daya Cares demo..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "Demo stopped."
}

trap cleanup EXIT INT TERM

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

wait_for_mysql() {
  echo "Waiting for MySQL on 127.0.0.1:3306..."
  node <<'NODE'
const mysql = require("mysql2/promise");

(async () => {
  for (let attempt = 1; attempt <= 45; attempt++) {
    try {
      const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST ?? "127.0.0.1",
        port: Number(process.env.MYSQL_PORT ?? 3306),
        user: process.env.MYSQL_USER ?? "daya",
        password: process.env.MYSQL_PASSWORD ?? "daya",
        database: process.env.MYSQL_DATABASE ?? "dayacares",
      });
      await connection.query("SELECT 1");
      await connection.end();
      process.exit(0);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  console.error("MySQL did not become ready in time.");
  process.exit(1);
})();
NODE
}

wait_for_api() {
  echo "Waiting for API at ${API_URL}/health..."
  for _ in $(seq 1 45); do
    if curl -fsS "${API_URL}/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "API did not become ready in time."
  exit 1
}

print_banner() {
  cat <<EOF

============================================================
  Daya Cares demo is running
============================================================
  App:  ${WEB_URL}
  API:  ${API_URL}

  Password for all demo users: Daya@2026

  Accounts:
    admin      Admin centre manager
    caregiver  Worker (Priya Sen)
    family     Family (Arjun Banerjee)
    customer   Care recipient (Anjali Banerjee)
    rahul      Worker

  Full walkthrough: doc/stakeholder-demo.md
  Print manual again: npm run demo:manual

  Press Ctrl+C to stop the demo.
============================================================

EOF
}

print_demo_outline() {
  cat <<'EOF'

------------------------------------------------------------
  STAKEHOLDER DEMO — STEP BY STEP
------------------------------------------------------------

  Suggested order: Admin -> Care Giver -> Family -> Customer
  Estimated time: 35-45 minutes

  PART 1 — ADMIN (admin / Daya@2026)
    1.1  Home dashboard — ops feed, today's routing, emergencies
    1.2  Members — register Care Recipient (7-step form), edit
    1.3  Users — create, edit, block/unblock, delete rules
    1.4  Worker routing — assign Care Giver, make primary, capacity, map
    1.5  Scheduling — IST calendar, auto-book week, add/cancel visits
    1.6  Reports — visit history, ops CSV, paper form PDFs, edit visit
    1.7  Billing — GST invoices, receipts, due reminders, mark paid
    1.8  Emergencies — raise SOS, call family, acknowledge, resolve

  PART 2 — CARE GIVER (caregiver / Daya@2026)
    2.1  Home — today's route and assigned Care Focus
    2.2  Today's route — start a scheduled visit
    2.3  Visit form — 17-step guided vitals (works offline)
    2.4  Clients — enter data for unscheduled visits
    2.5  Visit history and messages

  PART 3 — FAMILY (family / Daya@2026)
    3.1  Home — last visit vitals, next visit, linked member
    3.2  Emergency SOS — alert the centre
    3.3  Health records — open visit detail
    3.4  Notifications — SOS and visit alerts
    3.5  Profile — update contact details

  PART 4 — CARE RECIPIENT (customer / Daya@2026)
    4.1  Home — own health status and care team
    4.2  SOS, visit history, profile

  PART 5 — WRAP UP (back to admin)
    Show the full loop: register -> schedule -> visit -> report -> bill

  See doc/stakeholder-demo.md for the full script with talking points.
------------------------------------------------------------

EOF
}

need_cmd node
need_cmd npm
need_cmd curl

if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

if [ ! -d node_modules ] || [ ! -d node_modules/expo ]; then
  echo "Installing dependencies..."
  npm install
fi

if command -v docker >/dev/null 2>&1; then
  echo "Starting MySQL with Docker..."
  npm run db:up
else
  echo "Docker not found — using existing MySQL on 127.0.0.1:3306."
  echo "If MySQL is not running, start it with: npm run db:up"
fi

wait_for_mysql

echo "Starting API..."
npm run api:dev > /tmp/dayacares-api.log 2>&1 &
PIDS+=("$!")

wait_for_api

echo "Starting web app..."
npm run mobile:web > /tmp/dayacares-web.log 2>&1 &
PIDS+=("$!")

for _ in $(seq 1 60); do
  if curl -fsS "${WEB_URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

print_banner
print_demo_outline

if command -v open >/dev/null 2>&1; then
  open "${WEB_URL}"
fi

tail -f /tmp/dayacares-api.log /tmp/dayacares-web.log
