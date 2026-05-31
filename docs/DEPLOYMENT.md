# Deployment Guide

This guide covers how to publish **university-admission-officer** to npm.

## Prerequisites

1. **npm account**: Create one at [npmjs.com](https://npmjs.com)
2. **npm CLI authentication**: Run `npm login` and follow the prompts
3. **Git access**: Ensure you can push to the main repository
4. **Clean working directory**: All changes must be committed

## Publishing a Release

### 1. Prepare Your Changes

Ensure all work is committed and tests pass:

```bash
git status  # Should show clean working directory
npm run lint
npm run build
```

### 2. Run the Deployment Script

Use the deployment script to bump the version, run checks, and publish:

```bash
npm run deploy -- --version 2.0.5
```

The script will:
- ✓ Check npm authentication
- ✓ Verify git working directory is clean
- ✓ Update `package.json` version
- ✓ Run linter
- ✓ Build the project
- ✓ Run tests (if available)
- ✓ Create a git tag
- ✓ Publish to npm
- ✓ Push changes and tags to git

### 3. Verify Publication

Check npm to confirm the release:

```bash
npm view university-admission-officer@2.0.5
```

Or visit: https://www.npmjs.com/package/university-admission-officer

## Advanced Options

### Dry Run (Preview without publishing)

See what would be published without making any changes:

```bash
npm run deploy -- --version 2.0.5 --dry-run
```

### Beta/Pre-release Tags

Publish under a different npm tag (e.g., for beta versions):

```bash
npm run deploy -- --version 2.1.0-beta.1 --tag beta
```

Users can install with: `npm install university-admission-officer@beta`

### Skip Checks

If you've already verified linting/tests locally, skip them:

```bash
npm run deploy -- --version 2.0.5 --skip-lint --skip-tests
```

### Git-only Operations

If npm is already published and you just need to tag git:

```bash
npm run deploy -- --version 2.0.5 --skip-git=false
```

(Note: This will still create and push git tags, but skip npm publish)

## Versioning

Follow [Semantic Versioning](https://semver.org):

- **MAJOR.MINOR.PATCH** (e.g., `2.0.5`)
- `MAJOR`: Breaking changes
- `MINOR`: New features (backward compatible)
- `PATCH`: Bug fixes

Examples:
- `2.0.5` → stable release
- `2.1.0-beta.1` → beta with tag
- `2.0.0-rc.1` → release candidate

## Troubleshooting

### Not Logged In
```
Error: Not logged in to npm
```
**Fix:** Run `npm login` and authenticate with your npm account.

### Working Directory Has Changes
```
Error: Working directory has uncommitted changes
```
**Fix:** Commit all changes first: `git add . && git commit -m "message"`

### Build Fails
```
Error: Command failed: npm run build
```
**Fix:** Run `npm run build` locally to debug and fix issues before deploying.

### Already Published This Version
```
Error: You cannot publish over the previously published version
```
**Fix:** Bump to a new version using semantic versioning (e.g., `2.0.6`).

## Manual Deployment (if script fails)

If the automated script encounters issues, you can deploy manually:

```bash
# 1. Update version in package.json
npm version patch  # or 'minor', 'major'

# 2. Build
npm run build

# 3. Publish
npm publish

# 4. Tag and push (if npm publish succeeded)
git push origin main
git push origin --tags
```

## Post-Release

1. Verify the release on npm
2. Check that users can install: `npm install university-admission-officer@latest`
3. Update [CHANGELOG.md](../CHANGELOG.md) if you maintain one
4. Announce the release in relevant channels

## Links

- **npm package**: https://www.npmjs.com/package/university-admission-officer
- **GitHub repo**: https://github.com/mppise/admission-officer
- **npm documentation**: https://docs.npmjs.com/cli/publish
