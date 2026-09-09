#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANUAL="${ROOT}/doc/stakeholder-demo.md"

if [ ! -f "$MANUAL" ]; then
  echo "Demo manual not found at doc/stakeholder-demo.md"
  exit 1
fi

cat "$MANUAL"
