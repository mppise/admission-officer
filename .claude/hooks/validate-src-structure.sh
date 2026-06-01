#!/usr/bin/env bash
# validate-src-structure.sh: Enforces Architecture/9_Directory_Structure.md rules on src/ writes
# Runs as PreToolUse on Write to src/**

set -euo pipefail

TMPFILE=$(mktemp)
cat > "$TMPFILE"
trap 'rm -f "$TMPFILE"' EXIT

FILE_PATH=$(python3 - "$TMPFILE" << 'PYEOF'
import json, sys
try:
    with open(sys.argv[1]) as f:
        data = json.load(f)
    print(data.get('tool_input', {}).get('file_path', ''))
except Exception:
    print('')
PYEOF
)

if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Rule 1: Prompts must be in src/ai/prompts/*.md
# Block writes to src/ai/*.ts that contain inline prompt strings
if [[ "$FILE_PATH" =~ src/ai/[^/]+\.ts$ ]]; then
    CONTENT=$(python3 - "$TMPFILE" << 'PYEOF'
import json, sys
try:
    with open(sys.argv[1]) as f:
        data = json.load(f)
    print(data.get('tool_input', {}).get('content', ''))
except Exception:
    print('')
PYEOF
)
    if echo "$CONTENT" | grep -qE '"You are |"System: |`You are |`System: ' 2>/dev/null; then
        cat >&2 << 'EOF'

🚫 STRUCTURE VIOLATION: Inline prompt string detected in src/ai/*.ts

All prompts must be stored as Markdown files in src/ai/prompts/
(Architecture/9_Directory_Structure.md Rule 1).

Move prompt content to a .md file and load it at runtime.

EOF
        exit 2
    fi
fi

# Rule 2: SQL migrations are immutable — block writes to existing migration files
if [[ "$FILE_PATH" =~ src/db/migrations/.*\.sql$ ]]; then
    if [[ -f "$FILE_PATH" ]]; then
        cat >&2 << 'EOF'

🚫 STRUCTURE VIOLATION: Editing existing SQL migration file

Migrations are immutable (Architecture/9_Directory_Structure.md Rule 2).
Create a new versioned migration file instead of editing an existing one.

EOF
        exit 2
    fi
    # File does not exist yet = new migration = allowed
fi

exit 0
