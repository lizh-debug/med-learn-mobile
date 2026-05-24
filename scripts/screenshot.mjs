// Take screenshots of all 3 tabs
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotDir = join(__dirname, '..', 'screenshots');
mkdirSync(screenshotDir, { recursive: true });

const BASE = 'http://localhost:8082';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  // ===== 1. 骨架 Tab =====
  console.log('1/3: 骨架 tab...');
  await page.goto(BASE + '/(tabs)/skeleton', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(screenshotDir, '01-skeleton.png'), fullPage: false });
  console.log('  -> 01-skeleton.png');

  // Expand first layer
  const headers = page.locator('[class*="layerHeader"]');
  const headerCount = await headers.count();
  if (headerCount > 0) {
    await headers.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(screenshotDir, '02-skeleton-expanded.png'), fullPage: false });
    console.log('  -> 02-skeleton-expanded.png');
  }

  // ===== 2. 今天 Tab =====
  console.log('2/3: 今天 tab...');
  await page.goto(BASE + '/(tabs)/today', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(screenshotDir, '03-today.png'), fullPage: false });
  console.log('  -> 03-today.png');

  // ===== 3. 锚点 Tab =====
  console.log('3/3: 锚点 tab...');
  await page.goto(BASE + '/(tabs)/anchors', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(screenshotDir, '04-anchor.png'), fullPage: false });
  console.log('  -> 04-anchor.png');

  // ===== Summary =====
  console.log('\n=== 汇总 ===');
  if (errors.length > 0) {
    console.log(`⚠ ${errors.length} console errors:`);
    errors.slice(0, 8).forEach(e => console.log('  -', e));
  } else {
    console.log('✓ No console errors');
  }

  console.log('Done! Screenshots saved to screenshots/');
  await browser.close();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
