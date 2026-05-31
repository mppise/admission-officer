# npm Package Contents & Installation Lifecycle

## What Gets Published to npm

The `"files"` field in `package.json` controls what's included when you publish:

```json
"files": [
  "dist/",
  "scripts/",
  "README.md",
  "docs/BROWSER_INSTALLATION.md"
]
```

### Published Files:

| Path | Contents | Purpose |
|------|----------|---------|
| `dist/` | **Compiled JavaScript + source maps** | Executable code (TypeScript compiled to JS) |
| `scripts/` | **install-browsers.js, deploy.js, etc.** | Utility scripts (including postinstall hook) |
| `README.md` | **Project documentation** | User-facing overview on npm |
| `docs/BROWSER_INSTALLATION.md` | **Browser setup docs** | Reference docs for users |

### NOT Published (excluded from npm):

- `src/` — TypeScript source (not needed after compilation)
- `node_modules/` — Dependencies (npm handles these separately)
- `.git/`, `.gitignore` — Git metadata
- `tsconfig.json`, `.eslintrc.js` — Build/dev configuration
- `CLAUDE.md`, `STATUS.md`, `SPECS/` — Internal project management
- All other tool configs

---

## Installation Lifecycle

When a user installs your package (`npm install university-admission-officer`), here's what happens:

### 1. **npm Install Phase** (standard npm behavior)
```
npm install university-admission-officer
```
- Downloads published tarball from npm registry
- Extracts `dist/`, `scripts/`, `README.md`, `docs/BROWSER_INSTALLATION.md`
- Runs `npm install` on the dependencies (Playwright, Puppeteer, etc.)
- ⚠️ **Dependency Installation is SLOW**: Playwright and Puppeteer are large packages (~200-500MB)

### 2. **Prepare Phase** (runs when package is linked or installed from local)
```json
"prepare": "npm run build"
```
- **When**: Only runs during local development (`npm install` from repo directory)
- **Not triggered** during `npm install` from npm registry (binary is pre-built in `dist/`)
- Purpose: Rebuilds TypeScript for developers working on the source

### 3. **Postinstall Hook** (runs AFTER dependencies are installed)
```json
"postinstall": "node scripts/install-browsers.js"
```

#### When does `install-browsers.js` run?

| Scenario | Runs? | When |
|----------|-------|------|
| `npm install university-admission-officer` (registry) | ✅ Yes | After all dependencies installed |
| `npm install` (in local repo) | ✅ Yes | After all dependencies installed |
| `npm ci` (CI/CD) | ✅ Yes* | *Unless CI=true env var detected |
| Docker / offline mode | ❌ No | Skips if CI=true or OFFLINE=true |

#### What does `install-browsers.js` do?

```javascript
const isCI = process.env.CI || process.env.CI_ENVIRONMENT_SLUG;
const isOffline = process.env.OFFLINE || process.env.NPM_CONFIG_OFFLINE;

if (isCI || isOffline) {
  console.log('Skipping browser installation (CI/offline mode detected)');
  process.exit(0);
}
```

**It installs browser binaries:**
1. `npx playwright install chromium` — ~150 MB
2. `npx puppeteer browsers install chrome` — ~300 MB

**Total disk usage after install:**
- npm package: ~50 MB
- Dependencies: ~500 MB (Playwright + Puppeteer)
- **Browser binaries: ~450 MB** ← installed by postinstall
- **Total: ~1 GB**

---

## Why Both Playwright and Puppeteer?

Looking at your code:
- `playwright` — Used for robust PDF export (`c06-pdf-exporter`)
- `puppeteer` — Listed as dependency (likely legacy or dual-engine support)

Both require browser binaries, which is why `install-browsers.js` installs both.

---

## Timeline: What User Sees

### For a local developer:
```
$ npm install
npm notice create a new package-lock.json file
npm notice added XXX packages
added XXX packages in 45s

Installing Playwright Chromium...
Installing Puppeteer Chrome...
✓ Browser installation complete
```

### For CI/CD (with CI=true):
```
$ npm install
npm notice added XXX packages
added XXX packages in 15s
Skipping browser installation (CI/offline mode detected)
```

### For Docker:
```dockerfile
ENV CI=true
RUN npm install  # Skips browser install
```

---

## Distribution of What's Packaged

### In `dist/`:
```
dist/
├── components/
│   ├── c01-cli-shell/
│   │   ├── index.js          ← bin entry point (executable)
│   │   ├── index.d.ts
│   │   └── index.js.map
│   ├── c02-ai-service/
│   ├── c03-document-generator/
│   ├── c04-interview-engine/
│   ├── c05-progress-tracker/
│   ├── c06-pdf-exporter/
│   │   └── styles/           ← CSS copied here by build
│   └── ...
├── ai/
│   └── prompts/              ← Markdown prompts copied here
└── utils/
    └── ...
```

All TypeScript is compiled to JavaScript with source maps.

### In `scripts/`:
```
scripts/
├── deploy.js          ← NEW: npm publish automation
├── install-browsers.js ← postinstall hook
└── ...
```

Both are executable Node.js scripts. `deploy.js` won't run unless you manually invoke it.

---

## Key Insights

### ✓ Good:
- Compiled `dist/` is efficient and tree-shakeable
- Users get fully functional CLI after `npm install`
- Browser installation is smart (skips in CI/Docker)
- Postinstall hook is resilient (doesn't crash install if it fails)

### ⚠️ Concerns:
- **Large install size (~1 GB)** due to browser binaries
- **Slow first install** (5+ minutes on slow connections)
- Both Playwright AND Puppeteer installed (consider if you need both)
- Postinstall runs on every install (could be optimized with a skip flag)

### 💡 Optimizations:
If you want users to skip browser install by default and download them on-demand:

1. Move browser installation to a separate script users run once
2. Or: Make `install-browsers.js` check if browsers already exist
3. Or: Use `optionalDependencies` for Playwright/Puppeteer

---

## Files to Consider Adding to `files` Array

Currently missing from npm package:

| File | Reason to Include |
|------|-------------------|
| `CHANGELOG.md` | Users want to see release notes |
| `LICENSE` | Good practice (Apache-2.0) |
| `docs/` | Help docs for users |

Update `package.json`:
```json
"files": [
  "dist/",
  "scripts/",
  "README.md",
  "docs/",
  "LICENSE",
  "CHANGELOG.md"
]
```

---

## Summary Table

| What | Where | Packaged? | When Runs | Size |
|------|-------|-----------|-----------|------|
| **TypeScript source** | `src/` | ❌ No | — | — |
| **Compiled JS** | `dist/` | ✅ Yes | Used when CLI runs | ~50 MB |
| **Browser binaries** | `node_modules/.bin/` | ⚠️ Downloaded during install | Used for PDF export | ~450 MB |
| **install-browsers.js** | `scripts/` | ✅ Yes | After npm install | < 1 KB |
| **deploy.js** | `scripts/` | ✅ Yes | Only if you run it manually | ~10 KB |
| **README.md** | root | ✅ Yes | Shown on npm page | ~5 KB |
