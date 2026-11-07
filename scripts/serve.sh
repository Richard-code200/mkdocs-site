#!/usr/bin/env bash
# 按真实 GitHub Pages 子路径构建并预览，不发布网站。
set -euo pipefail
cd "$(dirname "$0")/.."
export PORT="${PORT:-8082}"
export SITE_BASE_PATH="${SITE_BASE_PATH:-/mkdocs-site}"
QUARTZ_BASE_URL="localhost:$PORT$SITE_BASE_PATH" node quartz/bootstrap-cli.mjs build --output .preview
exec node scripts/serve.mjs
