#!/usr/bin/env bash
# Generate TypeScript fetch client from openapi.yaml into agents/ts-client.
# Run from repo root after any openapi.yaml change.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v npx &>/dev/null; then
  echo "npx not found; use bunx or install Node/npm."
  exit 1
fi

npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o ./agents/ts-client \
  --additional-properties=supportsES6=true

echo "Generated agents/ts-client from openapi.yaml"
