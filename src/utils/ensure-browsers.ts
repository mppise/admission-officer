import { spawn, execFile as execFileCallback } from 'child_process';
import { promisify } from 'util';

const execFile = promisify(execFileCallback);

/**
 * Ensure required browsers are installed before first use.
 * Runs browser installation commands if browsers are missing.
 */
export async function ensureBrowsersInstalled(): Promise<void> {
  try {
    // Check if Puppeteer Chrome is available
    await execFile('npx', ['puppeteer', 'browsers', 'list', '--installed']);
  } catch {
    console.log('Installing Puppeteer Chrome...');
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('npx', ['puppeteer', 'browsers', 'install', 'chrome'], {
        stdio: 'inherit',
        timeout: 5 * 60 * 1000,
      });
      proc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Browser installation failed with code ${code}`));
      });
      proc.on('error', reject);
    });
  }

  try {
    // Check if Playwright Chromium is available
    await execFile('npx', ['playwright', 'install-deps', 'chromium']);
  } catch {
    console.log('Installing Playwright Chromium...');
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('npx', ['playwright', 'install', 'chromium'], {
        stdio: 'inherit',
        timeout: 5 * 60 * 1000,
      });
      proc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Browser installation failed with code ${code}`));
      });
      proc.on('error', reject);
    });
  }
}
