# Browser Installation Guide

The `ao` (Admission Officer) CLI requires browser binaries to generate PDF documents. This guide explains how browser installation works and how to troubleshoot issues.

## Automatic Installation

When you install `ao`, the browser binaries (Puppeteer Chrome and Playwright Chromium) are automatically installed via the `postinstall` script:

```bash
npm install -g university-admission-officer
```

This will automatically download and cache the browser binaries in your system's node_modules directory.

## Manual Installation

If the automatic installation fails or you need to reinstall browsers:

```bash
# Install Puppeteer Chrome (used for PDF export)
npx puppeteer browsers install chrome

# Install Playwright Chromium (used for web scraping)
npx playwright install chromium
```

## Troubleshooting

### PDFs Cannot Be Generated

If you see an error like "PDF export failed: could not launch browser", run:

```bash
npx puppeteer browsers install chrome
```

### Memory Issues During Installation

Browser binaries are large (~300-500 MB). If installation fails due to memory constraints:

1. Free up disk space (browsers require ~1 GB total)
2. Run installation on a machine with better connectivity
3. Check available RAM: `node -e "console.log(Math.round(require('os').freemem() / 1024 / 1024 / 1024)) + 'GB'"`

### Network/Offline Installation

For offline or restricted networks, install browsers on a connected machine, then copy the cache directory:

```bash
# On a connected machine
npx puppeteer browsers install chrome
npx playwright install chromium

# Locate the cache directory (varies by OS):
# macOS: ~/Library/Caches/ms-playwright, ~/.cache/puppeteer
# Linux: ~/.cache/ms-playwright, ~/.cache/puppeteer
# Windows: %APPDATA%\ms-playwright, %APPDATA%\puppeteer

# Copy to your target machine and set environment variables:
export PUPPETEER_CACHE_DIR=/path/to/cache
export PLAYWRIGHT_BROWSERS_PATH=/path/to/cache
ao
```

### CI/CD Environments

In CI/CD pipelines (GitHub Actions, GitLab CI, etc.), browser installation is automatically skipped if the `CI` environment variable is detected. Install browsers in your CI configuration:

```yaml
# GitHub Actions example
- name: Install dependencies
  run: npm install

- name: Install browsers
  run: |
    npx puppeteer browsers install chrome
    npx playwright install chromium

- name: Run ao
  run: ao
```

## System Requirements

- **Node.js:** >= 20.0.0
- **Disk space:** ~1 GB for both Puppeteer and Playwright binaries
- **Memory:** 512 MB free RAM minimum
- **Network:** Required during first install (browsers are cached afterward)

## Environment Variables

Control browser installation behavior:

| Variable | Effect |
|---|---|
| `CI` | Skip browser installation (detected in CI/CD environments) |
| `OFFLINE` | Skip browser installation (for offline/restricted environments) |
| `PUPPETEER_CACHE_DIR` | Custom cache location for Puppeteer |
| `PLAYWRIGHT_BROWSERS_PATH` | Custom cache location for Playwright |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | Skip Playwright browser download |
| `PUPPETEER_SKIP_DOWNLOAD` | Skip Puppeteer browser download |

## More Information

- [Puppeteer troubleshooting](https://pptr.dev/troubleshooting)
- [Playwright system requirements](https://playwright.dev/docs/intro#system-requirements)
