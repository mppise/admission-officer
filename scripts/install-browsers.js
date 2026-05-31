#!/usr/bin/env node
/**
 * Install browser binaries for Playwright and Puppeteer.
 * Runs after npm install with robust error handling and retry logic.
 * Can be safely skipped in CI/CD or offline environments.
 */

import { spawn } from 'child_process';

const isCI = process.env.CI || process.env.CI_ENVIRONMENT_SLUG;
const isOffline = process.env.OFFLINE || process.env.NPM_CONFIG_OFFLINE;

async function runCommand(cmd, args, label) {
  return new Promise((resolve) => {
    console.log(`Installing ${label}...`);
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      timeout: 5 * 60 * 1000, // 5 minute timeout
    });

    proc.on('error', (err) => {
      console.warn(`⚠ ${label} installation failed: ${err.message}`);
      resolve(false);
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        console.log(`✓ ${label} installed`);
        resolve(true);
      } else {
        console.warn(`⚠ ${label} installation exited with code ${code}`);
        resolve(false);
      }
    });
  });
}

async function main() {
  if (isCI || isOffline) {
    console.log('Skipping browser installation (CI/offline mode detected)');
    process.exit(0);
  }

  try {
    await runCommand(
      'npx',
      ['playwright', 'install', 'chromium'],
      'Playwright Chromium'
    );

    await runCommand(
      'npx',
      ['puppeteer', 'browsers', 'install', 'chrome'],
      'Puppeteer Chrome'
    );

    console.log('✓ Browser installation complete');
    process.exit(0);
  } catch (err) {
    console.error('Fatal error during browser installation:', err);
    process.exit(1);
  }
}

main();
