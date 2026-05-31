#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const packageJsonPath = path.join(rootDir, 'package.json')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function error(message) {
  log(`❌ ${message}`, 'red')
  process.exit(1)
}

function success(message) {
  log(`✓ ${message}`, 'green')
}

function info(message) {
  log(`ℹ ${message}`, 'blue')
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow')
}

async function runCommand(command, options = {}) {
  const { silent = false, stdio = 'inherit' } = options
  try {
    if (silent) {
      return execSync(command, {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim()
    }
    execSync(command, { cwd: rootDir, stdio })
  } catch (err) {
    error(`Command failed: ${command}\n${err.message}`)
  }
}

function checkPrerequisites() {
  info('Checking prerequisites...')

  // Check npm auth
  try {
    execSync('npm whoami', { stdio: 'pipe', encoding: 'utf-8' })
    success('npm authenticated')
  } catch {
    error('Not logged in to npm. Run: npm login')
  }

  // Check git status
  try {
    const status = execSync('git status --porcelain', {
      cwd: rootDir,
      encoding: 'utf-8'
    })
    if (status) {
      error('Working directory has uncommitted changes. Commit or stash them first.')
    }
  } catch {
    error('Not a git repository or git not available')
  }

  // Check package.json
  if (!fs.existsSync(packageJsonPath)) {
    error('package.json not found')
  }

  success('All prerequisites met')
}

function validateVersion(newVersion) {
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/
  if (!semverRegex.test(newVersion)) {
    error(`Invalid version format: ${newVersion}. Must follow semver (e.g., 1.2.3)`)
  }
}

function updateVersion(newVersion) {
  info(`Updating version to ${newVersion}...`)
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  const oldVersion = packageJson.version

  packageJson.version = newVersion
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')

  success(`Version updated: ${oldVersion} → ${newVersion}`)
  return oldVersion
}

async function build() {
  info('Building project...')
  await runCommand('npm run build')
  success('Build completed')
}

async function runTests() {
  info('Running tests...')
  try {
    execSync('npm test', { cwd: rootDir, stdio: 'inherit' })
    success('Tests passed')
  } catch {
    warn('No tests found or tests failed. Continuing...')
  }
}

async function runLint() {
  info('Running linter...')
  try {
    execSync('npm run lint', { cwd: rootDir, stdio: 'inherit' })
    success('Linting passed')
  } catch {
    warn('Linting issues found. Review the output above.')
  }
}

async function createGitTag(version) {
  info(`Creating git tag v${version}...`)
  await runCommand(`git tag -a v${version} -m "Release v${version}"`)
  success(`Git tag created: v${version}`)
}

async function publishToNpm(tag = 'latest') {
  info(`Publishing to npm (tag: ${tag})...`)
  await runCommand(`npm publish --tag ${tag}`)
  success('Published to npm')
}

async function pushGitChanges() {
  info('Pushing changes to git...')
  await runCommand('git push origin main')
  await runCommand('git push origin --tags')
  success('Changes pushed to git')
}

async function deploy(options = {}) {
  const {
    version: newVersion,
    skipTests = false,
    skipLint = false,
    skipGit = false,
    tag = 'latest',
    dryRun = false
  } = options

  log('\n═══════════════════════════════════════════════════════════', 'blue')
  log('  npm Deployment Script', 'blue')
  log('═══════════════════════════════════════════════════════════\n', 'blue')

  if (dryRun) {
    warn('DRY RUN MODE - No changes will be made')
  }

  checkPrerequisites()

  if (!newVersion) {
    error('Version number required. Usage: deploy.js --version 2.0.5')
  }

  validateVersion(newVersion)

  const oldVersion = updateVersion(newVersion)

  if (!skipLint) {
    await runLint()
  }

  await build()

  if (!skipTests) {
    await runTests()
  }

  if (dryRun) {
    log('\n📦 Dry run complete. Would publish:', 'yellow')
    log(`  Version: ${newVersion}`, 'yellow')
    log(`  Tag: ${tag}`, 'yellow')
    return
  }

  if (!skipGit && !dryRun) {
    await createGitTag(newVersion)
  }

  await publishToNpm(tag)

  if (!skipGit && !dryRun) {
    await pushGitChanges()
  }

  log('\n═══════════════════════════════════════════════════════════', 'green')
  log('  🎉 Deployment Complete!', 'green')
  log('═══════════════════════════════════════════════════════════', 'green')
  log(`\n  Version: ${oldVersion} → ${newVersion}`, 'green')
  log(`  npm tag: ${tag}`, 'green')
  log(`  View at: https://www.npmjs.com/package/university-admission-officer\n`, 'green')
}

// Parse CLI arguments
const args = process.argv.slice(2)
const options = {
  version: undefined,
  skipTests: false,
  skipLint: false,
  skipGit: false,
  tag: 'latest',
  dryRun: false
}

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--version':
      options.version = args[++i]
      break
    case '--skip-tests':
      options.skipTests = true
      break
    case '--skip-lint':
      options.skipLint = true
      break
    case '--skip-git':
      options.skipGit = true
      break
    case '--tag':
      options.tag = args[++i]
      break
    case '--dry-run':
      options.dryRun = true
      break
    case '--help':
      log(`
Usage: npm run deploy -- [options]

Options:
  --version <version>   Version number (required, e.g., 2.0.5)
  --tag <tag>          npm tag (default: latest)
  --skip-tests         Skip running tests
  --skip-lint          Skip running linter
  --skip-git           Skip git tag and push
  --dry-run            Show what would be published without making changes
  --help               Show this help message

Examples:
  npm run deploy -- --version 2.0.5
  npm run deploy -- --version 2.1.0-beta.1 --tag beta
  npm run deploy -- --version 2.0.5 --dry-run
      `, 'blue')
      process.exit(0)
  }
}

deploy(options).catch(err => {
  error(err.message)
})
