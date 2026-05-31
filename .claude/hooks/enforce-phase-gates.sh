#!/bin/bash
# enforce-phase-gates.sh: Tier 1 enforcement of SpecGantry contract (Automation Notes)
# Runs as a PreToolUse hook when Edit/Write target src/

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATUS_FILE="$PROJECT_ROOT/STATUS.md"

# Extract Development phase status from STATUS.md
get_dev_status() {
    if [ ! -f "$STATUS_FILE" ]; then
        echo "unknown"
        return
    fi
    grep -A 1 "^## Development" "$STATUS_FILE" 2>/dev/null | grep "Status:" | sed 's/.*Status: //' | tr -d ' ' || echo "unknown"
}

# CODE_CHANGE: Block src/ edits unless Development phase is active
if [ "${ENFORCE_CHECK}" = "code_change" ]; then
    dev_status=$(get_dev_status)

    # Check if Development is in progress or complete
    if [ "$dev_status" != "🔄InProgress" ] && [ "$dev_status" != "✅Complete" ]; then
        cat >&2 << 'EOF'

🚫 CODE CHANGE BLOCKED: Development phase required

CONTRACT.md Automation Notes:
Code changes to src/ are blocked when Development phase is not active.

Current Development status: unknown
(Check STATUS.md for actual phase state)

To fix:
  1. Read STATUS.md — verify Development phase is "🔄 In Progress" or "✅ Complete"
  2. If Development is not active, enter /design to create component specs first
  3. Resubmit the code change

Reference: ./.claude/CONTRACT.md § Automation Notes

EOF
        exit 2
    fi
    exit 0
fi

exit 0
