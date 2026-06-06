#!/usr/bin/env node

/**
 * Start the Admission Officer web server
 * Loads environment variables from .env file and starts the Express server
 */

import { config } from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Load .env file
const envPath = path.join(projectRoot, '.env');
const result = config({ path: envPath });

if (result.error) {
  console.warn(`⚠️  Warning: Could not load .env file at ${envPath}`);
  console.warn('   Using environment variables or defaults instead\n');
}

// Display configuration
console.log('🚀 Starting Admission Officer Web Server\n');
console.log('Configuration:');
console.log(`  Port:           ${process.env.PORT || 3000}`);
console.log(`  Gemini API Key: ${process.env.GEMINI_API_KEY ? '✓ configured' : '✗ not set (university scraping will fail)'}`);
console.log(`  Gemini Model:   ${process.env.GEMINI_MODEL || 'gemini-2.5-flash (default)'}`);
console.log(`  Token Window:   ${process.env.GEMINI_TOKEN_WINDOW || '1048576 (default)'}`);
console.log(`  Content Budget: ${process.env.GEMINI_CONTENT_BUDGET_PCT || '60% (default)'}\n`);

if (!process.env.GEMINI_API_KEY) {
  console.log('⚠️  GEMINI_API_KEY not set. University scraping will not work.');
  console.log('   Set it in .env or as an environment variable to enable.\n');
}

// Start the server
const serverPath = path.join(projectRoot, 'dist/web/server.js');
const server = spawn('node', [serverPath], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production'
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down server...');
  server.kill();
  process.exit(0);
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Server exited with code ${code}`);
  }
  process.exit(code);
});
