#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

swiftc -O \
  -framework AppKit \
  -framework QuartzCore \
  WaterPulse.swift \
  -o water-pulse

swiftc -O \
  -framework CoreAudio \
  MicActive.swift \
  -o mic-active

swiftc -O \
  -framework AppKit \
  ListApps.swift \
  -o list-apps

echo "Built: $(pwd)/water-pulse"
echo "Built: $(pwd)/mic-active"
echo "Built: $(pwd)/list-apps"
