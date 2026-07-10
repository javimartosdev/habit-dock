#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVG="$ROOT/public/icons/icon.svg"

convert -density 384 -background none "$SVG" -resize 192x192 "$ROOT/public/icons/icon-192.png"
convert -density 384 -background none "$SVG" -resize 512x512 "$ROOT/public/icons/icon-512.png"
convert -density 384 -background none "$SVG" -resize 180x180 "$ROOT/public/apple-touch-icon.png"

echo "Icons generated in public/icons/ and public/apple-touch-icon.png"
