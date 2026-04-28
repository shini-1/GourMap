#!/usr/bin/env bash
# scripts/setup-eas-secrets.sh
#
# One-time setup: stores project-level secrets in EAS so every
# build gets them automatically without touching GitHub Secrets.
#
# Prerequisites:
#   npm install -g eas-cli
#   eas login
#   Run from the project root

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

echo ""
echo "🔐 GourMap — EAS Secrets Setup"
echo "================================="
echo ""

# ── Preflight ────────────────────────────────────────────────────────────────
command -v eas >/dev/null 2>&1 || error "eas-cli not found. Run: npm install -g eas-cli"
eas whoami >/dev/null 2>&1     || error "Not logged in. Run: eas login"

info "Logged in as: $(eas whoami)"
echo ""

read -rp "Continue setting up EAS project secrets? (y/N): " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { warn "Aborted."; exit 0; }

# ── Helper ───────────────────────────────────────────────────────────────────
set_secret() {
  local name="$1"
  local value="$2"
  eas secret:create --scope project --name "$name" --value "$value" --force
  info "✓ $name"
}

# ── Supabase ─────────────────────────────────────────────────────────────────
echo ""
echo "📊 Supabase"
echo "------------"
read -rp  "EXPO_PUBLIC_SUPABASE_URL (https://...supabase.co): " SUPABASE_URL
read -rsp "EXPO_PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
echo ""

set_secret "EXPO_PUBLIC_SUPABASE_URL"      "$SUPABASE_URL"
set_secret "EXPO_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"

# ── Mapbox ───────────────────────────────────────────────────────────────────
echo ""
echo "🗺️  Mapbox"
echo "----------"
warn "This is the SECRET downloads token (starts with 'sk.'), NOT the public pk. token."
read -rsp "MAPBOX_DOWNLOADS_TOKEN: " MAPBOX_DL_TOKEN
echo ""

set_secret "MAPBOX_DOWNLOADS_TOKEN" "$MAPBOX_DL_TOKEN"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
info "All EAS project secrets configured!"
echo ""
echo "────────────────────────────────────────"
echo "📋 Next step — add ONE GitHub secret:"
echo ""
echo "  Secret name : EXPO_TOKEN"
echo "  Value       : (your Expo access token)"
echo "  URL         : https://github.com/shini-1/GourMap/settings/secrets/actions"
echo ""
echo "  Get your token → https://expo.dev/accounts/[account]/settings/access-tokens"
echo "────────────────────────────────────────"
echo ""
info "Done. Push to 'main' to trigger a preview build. Tag 'v*.*.*' for production."
