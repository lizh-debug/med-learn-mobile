// Verify all recent changes in the browser
import { chromium } from 'playwright';

const BASE = 'http://localhost:8082';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  // ===== 1. Check overview page has new content =====
  console.log('=== 1. Overview page ("入门指南") ===');
  await page.goto(BASE + '/overview', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  const body = await page.textContent('body');
  console.log('  Title "入门指南":', body?.includes('入门指南') ?? false);
  console.log('  "什么是模块化学习":', body?.includes('什么是模块化学习') ?? false);
  console.log('  "为什么要模块化学习":', body?.includes('为什么要模块化学习') ?? false);
  console.log('  "如何使用本软件":', body?.includes('如何使用本软件') ?? false);

  // ===== 2. Check skeleton tab has intro banner =====
  console.log('\n=== 2. Skeleton tab intro banner ===');
  await page.goto(BASE + '/(tabs)/skeleton', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  const skBody = await page.textContent('body');
  console.log('  "入门指南" banner:', skBody?.includes('入门指南') ?? false);
  console.log('  "3 分钟快速上手":', skBody?.includes('3 分钟快速上手') ?? false);

  // ===== 3. Check speed anchor click =====
  console.log('\n=== 3. Speed anchor click ===');
  // First click a layer to expand it
  const layerHeaders = page.locator('text=基础层');
  if (await layerHeaders.count() > 0) {
    await layerHeaders.first().click();
    await page.waitForTimeout(800);
  }

  // Find a speed anchor node
  const speedBadge = page.locator('text=📖').first();
  if (await speedBadge.count() > 0) {
    console.log('  Speed anchor found, clicking...');
    // Find the clickable node row that contains the speed badge
    const nodeRow = speedBadge.locator('..');
    await nodeRow.click();
    await page.waitForTimeout(3000);

    const cardBody = await page.textContent('body');
    console.log('  "速通锚点":', cardBody?.includes('速通锚点') ?? false);
    console.log('  "本质概括":', cardBody?.includes('本质概括') ?? false);
    console.log('  "课本出处":', cardBody?.includes('课本出处') ?? false);
    console.log('  "使用内置摘要":', cardBody?.includes('使用内置摘要') ?? false);
    console.log('  "创建新卡片":', cardBody?.includes('创建新卡片') ?? false);
  } else {
    console.log('  No speed anchor found (may not be visible without expanding)');
  }

  // ===== Summary =====
  console.log('\n=== Summary ===');
  if (errors.length > 0) {
    console.log(`⚠ ${errors.length} console errors:`);
    errors.slice(0, 5).forEach(e => console.log('  -', e));
  } else {
    console.log('✓ No console errors');
  }

  await browser.close();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
