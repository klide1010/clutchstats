#!/usr/bin/env bash
# Seleziona il profilo Cloudflare per questo progetto e, se serve, fa il login.
#   scripts/cf-profile.sh personal   → login con l'account personale (cartella config separata)
#   scripts/cf-profile.sh work       → usa il login wrangler globale del Mac
#   scripts/cf-profile.sh status     → mostra il profilo attivo e l'account collegato
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE_FILE="$ROOT/.cf-profile"
PERSONAL_HOME="$HOME/.config/bkstats-cloudflare-personal"

profile="${1:-status}"
case "$profile" in
  personal)
    echo personal > "$PROFILE_FILE"
    mkdir -p "$PERSONAL_HOME"
    echo "Profilo attivo: personal (config in $PERSONAL_HOME)"
    if XDG_CONFIG_HOME="$PERSONAL_HOME" npx --prefix "$ROOT/worker" wrangler whoami 2>/dev/null | grep -q "logged in"; then
      XDG_CONFIG_HOME="$PERSONAL_HOME" npx --prefix "$ROOT/worker" wrangler whoami | grep -E "logged in|Account Name|│" || true
    else
      echo "Apro il browser per il login: accedi con l'account personale."
      XDG_CONFIG_HOME="$PERSONAL_HOME" npx --prefix "$ROOT/worker" wrangler login
      XDG_CONFIG_HOME="$PERSONAL_HOME" npx --prefix "$ROOT/worker" wrangler whoami | grep -E "logged in|Account Name|│" || true
    fi
    ;;
  work)
    echo work > "$PROFILE_FILE"
    echo "Profilo attivo: work (login wrangler globale)"
    npx --prefix "$ROOT/worker" wrangler whoami | grep -E "logged in|Account Name|│" || true
    ;;
  status)
    p="$(cat "$PROFILE_FILE" 2>/dev/null || echo work)"
    echo "Profilo attivo: $p"
    if [ "$p" = personal ]; then
      XDG_CONFIG_HOME="$PERSONAL_HOME" npx --prefix "$ROOT/worker" wrangler whoami 2>&1 | grep -E "logged in|not authenticated|Account Name|│" || true
    else
      npx --prefix "$ROOT/worker" wrangler whoami 2>&1 | grep -E "logged in|not authenticated|Account Name|│" || true
    fi
    ;;
  *) echo "Uso: $0 personal|work|status"; exit 1 ;;
esac
