# Browser Installation Guide

This document explains browser installation for **university-admission-officer**.

## Overview

The package requires browser binaries for PDF export and document generation features using Playwright and Puppeteer.

## Automatic Installation

When you install the package, browsers are installed automatically via the **postinstall hook**:

```bash
npm install university-admission-officer
# ✓ Playwright Chromium installed (~150 MB)
# ✓ Puppeteer Chrome installed (~300 MB)
```

This happens **automatically** unless:
- You're in a CI/CD environment (`CI=true`)
- You're in offline mode (`OFFLINE=true`)
- You explicitly skip it

### Time & Disk Space

- **Installation time**: 3-5 minutes (first time only)
- **Disk space**: ~450 MB for browser binaries
- **Network**: ~450 MB download

## Manual Installation

If browser installation was skipped, you can install them manually:

### Install Playwright Chromium

```bash
npx playwright install chromium
```

### Install Puppeteer Chrome

```bash
npx puppeteer browsers install chrome
```

### Install Both

```bash
npx playwright install chromium && npx puppeteer browsers install chrome
```

## CI/CD Environment Setup

### GitHub Actions

Browsers are skipped by default in CI. To install them:

```yaml
- name: Install dependencies
  run: npm install

- name: Install browsers
  run: |
    npx playwright install chromium
    npx puppeteer browsers install chrome
```

Or use a Docker image with browsers pre-installed:

```yaml
container:
  image: mcr.microsoft.com/playwright:v1.40.0-jammy
```

### Docker

```dockerfile
FROM node:20-bullseye

WORKDIR /app

# Install dependencies and skip postinstall
ENV CI=true
RUN npm install

# Install browsers explicitly
RUN npx playwright install chromium && \
    npx puppeteer browsers install chrome

COPY . .

CMD ["npx", "ao"]
```

### GitLab CI

```yaml
image: node:20

before_script:
  - export CI=true
  - npm install
  - npx playwright install chromium
  - npx puppeteer browsers install chrome
```

## Verify Installation

### Check Playwright Chromium

```bash
npx playwright install-deps chromium
npx playwright exec chromium -- --version
```

### Check Puppeteer Chrome

```bash
npx puppeteer browsers list --installed
npx puppeteer browsers list
```

## Troubleshooting

### "Browser not found" Error

If you see errors like `Error: Launch failed` or `Chromium not found`:

1. **Check if browsers are installed:**
   ```bash
   npx playwright install chromium
   npx puppeteer browsers install chrome
   ```

2. **Verify installation:**
   ```bash
   npx puppeteer browsers list --installed
   ```

3. **Check disk space:**
   ```bash
   df -h  # macOS/Linux
   dir C:\  # Windows
   ```

### Slow Installation

Browser installation downloads can be slow. To speed up:

1. **Use a faster network**
2. **Check internet connection**: `ping 8.8.8.8`
3. **Use a cache** in CI/CD (see CI examples above)

### Installation Timeout

If installation times out:

1. **Increase timeout** in your CI/CD config
2. **Use pre-built Docker images** instead
3. **Install browsers locally** and commit them (not recommended)

### Permission Denied Error

If you see permission errors:

```bash
# macOS/Linux
chmod -R u+w ~/.cache/ms-playwright
chmod -R u+w ~/.wdm

# Try installing again
npx playwright install chromium
```

### Out of Disk Space

Browser binaries require ~450 MB. If you're running low on disk:

1. **Free up space** on your system
2. **Use a Docker image** with pre-installed browsers
3. **Install only what you need:**
   ```bash
   # If you only use Playwright
   npx playwright install chromium
   # Skip: npx puppeteer browsers install chrome
   ```

## Which Browser Do I Need?

- **Playwright Chromium**: Used for PDF export and document generation
- **Puppeteer Chrome**: May be used for additional rendering tasks

Both are installed by default. If you only use one, you can skip the other installation.

## Environment Variables

Control browser installation with environment variables:

| Variable | Value | Effect |
|----------|-------|--------|
| `CI` | `true` | Skip browser installation in CI/CD |
| `CI_ENVIRONMENT_SLUG` | `true` | Skip browser installation (GitLab CI) |
| `OFFLINE` | `true` | Skip browser installation (offline mode) |
| `NPM_CONFIG_OFFLINE` | `true` | npm offline mode (skips postinstall) |

Example:

```bash
# Skip browser installation
CI=true npm install

# Offline mode
npm install --offline
```

## Platform-Specific Notes

### macOS

- Supported on Intel and Apple Silicon (M1/M2/M3)
- May prompt for permission on first run (allow it)
- Browsers stored in `~/.cache/ms-playwright` and `~/.wdm`

### Linux

- Requires glibc-based systems (Ubuntu, Debian, etc.)
- Alpine Linux not supported (use custom Docker image)
- Browsers stored in `~/.cache/ms-playwright` and `~/.wdm`

### Windows

- Supported on Windows 10 and later
- Requires about 1 GB total disk space
- Browsers stored in `%USERPROFILE%\.wdm` and `%APPDATA%\ms-playwright`

## Links

- [Playwright Installation](https://playwright.dev/docs/intro#installation)
- [Puppeteer Installation](https://pptr.dev/guides/installation)
- [Troubleshooting Playwright](https://playwright.dev/docs/troubleshooting)
- [Puppeteer Troubleshooting](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md)
