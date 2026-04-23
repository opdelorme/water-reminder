#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

swiftc -O \
  -framework AppKit \
  -framework QuartzCore \
  WaterPulse.swift \
  -o water-pulse

echo "Built: $(pwd)/water-pulse"
