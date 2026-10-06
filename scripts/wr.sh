#!/usr/bin/env bash
# Esegue wrangler con il profilo Cloudflare selezionato da scripts/cf-profile.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$(cat "$ROOT/.cf-profile" 2>/dev/null || echo work)" = personal ]; then
  export XDG_CONFIG_HOME="$HOME/.config/bkstats-cloudflare-personal"
fi
cd "$ROOT/worker" && exec npx wrangler "$@"
