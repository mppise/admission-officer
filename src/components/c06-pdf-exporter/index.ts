import puppeteer from 'puppeteer';
import { marked } from 'marked';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureBrowsersInstalled } from '../../utils/ensure-browsers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// CSS is copied to dist/components/c06-pdf-exporter/styles/ at build time (see package.json build script)
const CSS_PATH = path.join(__dirname, 'styles', 'pdf.css');

// [C06-F01] Convert markdown to HTML with inline CSS
async function markdownToHtml(markdownContent: string): Promise<string> {
  let cssContent: string;
  try {
    cssContent = await fs.readFile(CSS_PATH, 'utf8');
  } catch {
    throw new Error(`PDF export failed: CSS stylesheet not found at ${CSS_PATH}`);
  }

  let htmlBody: string;
  try {
    htmlBody = await marked.parse(markdownContent);
  } catch {
    throw new Error('PDF export failed: could not parse markdown');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
${cssContent}
  </style>
</head>
<body>
  <div class="ao-document">
${htmlBody}
  </div>
</body>
</html>`;
}

// [C06-F02] Render HTML to PDF via Puppeteer
async function renderPdf(htmlContent: string, pdfPath: string): Promise<void> {
  let browser;
  let browserStarted = false;

  try {
    browser = await puppeteer.launch({ headless: true });
    browserStarted = true;
  } catch (err) {
    // Browser launch failed - ensure browsers are installed and retry
    console.log('Browser not ready, installing...');
    try {
      await ensureBrowsersInstalled();
      browser = await puppeteer.launch({ headless: true });
      browserStarted = true;
    } catch (retryErr) {
      const errMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      throw new Error(
        `PDF export failed: could not launch browser. Please ensure Puppeteer Chrome is installed.\n` +
        `Try running: npx puppeteer browsers install chrome\n` +
        `Error: ${errMsg}`
      );
    }
  }

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    try {
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
      });
    } catch (writeErr) {
      const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
      throw new Error(`PDF export failed: could not write to ${pdfPath}. ${msg}`);
    }
  } finally {
    if (browserStarted && browser) {
      await browser.close();
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

// [C06-F01, C06-F02] Export markdown file to PDF
export async function exportToPdf(markdownPath: string): Promise<{ pdfPath: string }> {
  // Read source markdown
  let markdownContent: string;
  try {
    markdownContent = await fs.readFile(markdownPath, 'utf8');
  } catch {
    throw new Error(`PDF export failed: source file not found at ${markdownPath}`);
  }

  const pdfPath = markdownPath.replace(/\.md$/, '.pdf');

  const htmlContent = await markdownToHtml(markdownContent);
  await renderPdf(htmlContent, pdfPath);

  return { pdfPath };
}
