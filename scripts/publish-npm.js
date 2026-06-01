#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isMinor = args.includes('--minor')
const isMajor = args.includes('--major')
const isPatch = args.includes('--patch') || (!isMinor && !isMajor)

function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m',
  }
  const prefix = type === 'info' ? 'ℹ' : type === 'success' ? '✓' : type === 'warn' ? '⚠' : '✗'
  console.log(`${colors[type]}${prefix} ${msg}${colors.reset}`)
}

function exec(cmd, opts = {}) {
  const { silent = false, failOnError = true } = opts
  try {
    const result = execSync(cmd, {
      cwd: projectRoot,
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
    })
    return result.trim()
  } catch (err) {
    if (failOnError) {
      log(`Command failed: ${cmd}`, 'error')
      log(err.message, 'error')
      process.exit(1)
    }
    return null
  }
}

function readPackageJson() {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'))
}

function writePackageJson(pkg) {
  fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
}

function incrementVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number)
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

async function publish() {
  log('NPM Publisher — university-admission-officer', 'info')
  console.log()

  // Step 1: Verify environment
  log('Checking environment...', 'info')
  const gitStatus = exec('git status --porcelain', { silent: true })
  if (gitStatus) {
    log('Uncommitted changes detected. Please commit or stash changes.', 'error')
    process.exit(1)
  }
  log('Git working directory clean', 'success')

  // Step 2: Verify npm login
  if (!isDryRun) {
    const npmWhoami = exec('npm whoami', { silent: true, failOnError: false })
    if (!npmWhoami) {
      log('Not authenticated with npm. Run: npm login', 'error')
      process.exit(1)
    }
    log(`Authenticated as: ${npmWhoami}`, 'success')
  }

  // Step 3: Read current version
  const pkg = readPackageJson()
  const currentVersion = pkg.version
  const newVersion = incrementVersion(currentVersion, isMajor ? 'major' : isMinor ? 'minor' : 'patch')

  log(`Current version: ${currentVersion}`, 'info')
  log(`New version: ${newVersion} (${isMajor ? 'major' : isMinor ? 'minor' : 'patch'})`, 'info')
  console.log()

  // Step 4: Run tests and build
  log('Building and testing...', 'info')
  exec('npm run typecheck')
  exec('npm run lint')
  exec('npm run build')
  log('Build successful', 'success')
  console.log()

  // Step 5: Update version
  log(`Updating version to ${newVersion}...`, 'info')
  pkg.version = newVersion
  writePackageJson(pkg)
  log('Version updated', 'success')

  // Step 6: Create git tag and commit
  if (!isDryRun) {
    log('Creating git tag...', 'info')
    exec(`git add package.json`)
    exec(`git commit -m "chore: release v${newVersion}"`)
    exec(`git tag v${newVersion}`)
    log(`Git tag v${newVersion} created`, 'success')
    console.log()
  }

  // Step 7: Publish to npm
  console.log()
  log(isDryRun ? 'DRY RUN: Would publish to npm' : 'Publishing to npm...', isDryRun ? 'warn' : 'info')

  if (isDryRun) {
    log('Run without --dry-run to actually publish', 'warn')
    log(`Command that would run: npm publish --new-version ${newVersion}`, 'info')
  } else {
    exec('npm publish')
    log(`Published v${newVersion} to npm`, 'success')
    console.log()

    // Step 8: Push to git
    log('Pushing to git...', 'info')
    exec('git push origin main')
    exec('git push origin v${newVersion}')
    log('Pushed to git', 'success')
    console.log()

    log(`Successfully published v${newVersion}!`, 'success')
    log(`Install with: npm install university-admission-officer@${newVersion}`, 'info')
  }
}

console.log()
publish().catch((err) => {
  log(err.message, 'error')
  process.exit(1)
})
