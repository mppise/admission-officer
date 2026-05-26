#!/usr/bin/env bash
# deploy/go.sh — builds and publishes university-admission-officer to npmjs
#
# Deployment model: npm package (no containerisation — local CLI tool per B_Architecture.md §12.2)
# Usage:
#   bash deploy/go.sh            # publish to npm (prompts for automation token on first run)
#   bash deploy/go.sh --dry-run  # validate package without publishing
#
# Prerequisites:
#   - Node.js >= 20 installed
#   - Logged in to npm: npm login
#   - Run from the project root

set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown argument: $arg"; echo "Usage: bash deploy/go.sh [--dry-run]"; exit 1 ;;
  esac
done

PKG_NAME=$(node -p "require('./package.json').name")
PKG_VERSION=$(node -p "require('./package.json').version")

echo "══════════════════════════════════════════════════════"
echo "  $PKG_NAME v$PKG_VERSION"
if $DRY_RUN; then
  echo "  Mode: DRY RUN — no package will be published"
else
  echo "  Mode: PUBLISH"
fi
echo "══════════════════════════════════════════════════════"

# ── Step 1: Environment checks ────────────────────────────

echo ""
echo "── Step 1: Environment checks ────────────────────────"

# Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "✗ Node.js >= 20 required (found v$NODE_VERSION)"
  exit 1
fi
echo "✓ Node.js v$NODE_VERSION"

# npm available
if ! command -v npm &>/dev/null; then
  echo "✗ npm not found"
  exit 1
fi
echo "✓ npm $(npm --version)"

# npm login check
NPM_USER=$(npm whoami 2>/dev/null || echo "")
if [ -z "$NPM_USER" ]; then
  echo "✗ Not logged in to npm. Run: npm login"
  exit 1
fi
echo "✓ Logged in as: $NPM_USER"

# Network connectivity to npm registry
if ! curl -sf https://registry.npmjs.org/ -o /dev/null --max-time 5; then
  echo "✗ Cannot reach npm registry (https://registry.npmjs.org/)"
  exit 1
fi
echo "✓ npm registry reachable"

# ── Step 2: Build ─────────────────────────────────────────

echo ""
echo "── Step 2: Build ─────────────────────────────────────"
npm run build
echo "✓ Build complete"

# ── Step 3: Package validation ────────────────────────────

echo ""
echo "── Step 3: Package validation ────────────────────────"

# Verify shebang
if ! head -1 dist/cli/index.js | grep -q "#!/usr/bin/env node"; then
  echo "✗ dist/cli/index.js missing shebang"
  exit 1
fi
echo "✓ CLI entry point has shebang"

# Verify prompt files are present
PROMPT_COUNT=$(find dist/ai/prompts -name "*.prompt.md" | wc -l | tr -d ' ')
if [ "$PROMPT_COUNT" -lt 4 ]; then
  echo "✗ Expected >= 4 prompt files in dist/ai/prompts/, found $PROMPT_COUNT"
  exit 1
fi
echo "✓ Prompt files present ($PROMPT_COUNT files)"

# Verify CSS
if [ ! -f dist/components/c06-pdf-exporter/styles/pdf.css ]; then
  echo "✗ PDF stylesheet missing from dist/"
  exit 1
fi
echo "✓ PDF stylesheet present"

# npm pack dry-run (validates package.json, files list, bin)
echo ""
npm publish --dry-run 2>&1 | grep -E "npm notice|npm warn" | grep -v "^npm notice $"
echo ""

# ── Step 4: Publish ───────────────────────────────────────

echo "── Step 4: Publish ───────────────────────────────────"
if $DRY_RUN; then
  echo "  Dry run complete — skipping publish."
else
  # Check if an automation token is already configured
  EXISTING_TOKEN=$(npm config get //registry.npmjs.org/:_authToken 2>/dev/null || echo "")
  if [ -z "$EXISTING_TOKEN" ] || [ "$EXISTING_TOKEN" = "null" ] || [ "$EXISTING_TOKEN" = "undefined" ]; then
    echo ""
    echo "  No automation token found. Opening npm token page..."
    echo ""
    echo "  ┌─────────────────────────────────────────────────┐"
    echo "  │  Instructions:                                  │"
    echo "  │  1. Log in to npmjs.com if prompted             │"
    echo "  │  2. Set an expiration (or choose 'No expiry')   │"
    echo "  │  3. Under Packages: select 'university-admission-officer'  │"
    echo "  │  4. Set permission to 'Read and write'          │"
    echo "  │  5. Click 'Generate token'                      │"
    echo "  │  6. Copy the token (starts with npm_...)        │"
    echo "  │  7. Paste it here and press Enter               │"
    echo "  └─────────────────────────────────────────────────┘"
    echo ""
    open "https://www.npmjs.com/settings/mppise/tokens/granular-access-tokens/new" 2>/dev/null || \
      xdg-open "https://www.npmjs.com/settings/mppise/tokens/granular-access-tokens/new" 2>/dev/null || true
    read -rsp "  Paste automation token: " AUTOMATION_TOKEN
    echo ""
    if [ -z "$AUTOMATION_TOKEN" ]; then
      echo "✗ No token provided — aborting."
      exit 1
    fi
    npm config set //registry.npmjs.org/:_authToken "$AUTOMATION_TOKEN"
    echo "✓ Token saved to npm config — you won't be asked again."
  fi

  npm publish
  echo "✓ Published $PKG_NAME@$PKG_VERSION"
  echo ""
  echo "  Verify at: https://www.npmjs.com/package/$PKG_NAME"
  echo "  Install:   npm install -g $PKG_NAME"
  echo "  Run:       ao --help"
fi

echo ""
echo "══════════════════════════════════════════════════════"
if $DRY_RUN; then
  echo "  Dry run complete. Run without --dry-run to publish."
else
  echo "  Release $PKG_NAME@$PKG_VERSION complete."
fi
echo "══════════════════════════════════════════════════════"
