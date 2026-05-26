# university-admission-officer v1.0.1 — Patch Release

**Released:** 2026-05-25
**Type:** Patch (manifest fix)

## What changed

- **Fixed broken install for v1.0.0.** The previous release was missing the `puppeteer` dependency in `package.json`, causing `npm install -g university-admission-officer@1.0.0` to fail during build/postinstall. v1.0.1 declares the dependency and installs the required Chromium binary automatically.
- No functional, CLI, or behavioural changes — same features as v1.0.0.

## Required actions

- Users who attempted v1.0.0 should upgrade: `npm install -g university-admission-officer@1.0.1`.
- First install will download two Chromium binaries (Playwright for crawling, Puppeteer for PDF export) — expect ~150 MB extra disk usage.

## Known limitations

- No automated test suite (MVP scope per architecture).
- PDF export requires the Puppeteer-bundled Chromium; corporate-locked machines that block Chromium download during `postinstall` will need an alternative provisioning path.

## Deprecation note

`university-admission-officer@1.0.0` is deprecated and should not be used.
