import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');

const base = (process.env.TEST_BASE_URL || 'https://achola-odhiambo-advocates.pages.dev').replace(/\/$/, '');
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;
if (!email || !password) throw new Error('TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are required.');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, bypassCSP: true });
const errors = [];
const accessibilityFailures = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.goto(`${base}/admin`, { waitUntil: 'networkidle' });
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill(password);
  await page.locator('[data-login-form] button').click();
  await page.waitForSelector('[data-dashboard]:not([hidden])');
  await page.screenshot({ path: '/tmp/achola-admin-mobile.png', fullPage: true });
  await page.addScriptTag({ path: axePath });
  let audit = await page.evaluate(() => axe.run());
  accessibilityFailures.push(...audit.violations.filter(violation => ['serious', 'critical'].includes(violation.impact)).map(violation => `admin:${violation.id}:${violation.nodes.map(node => node.target.join(' ')).join('|')}`));
  await page.goto(`${base}/insights/before-filing-for-divorce-in-kenya`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/achola-article-mobile.png', fullPage: true });
  await page.addScriptTag({ path: axePath });
  audit = await page.evaluate(() => axe.run());
  accessibilityFailures.push(...audit.violations.filter(violation => ['serious', 'critical'].includes(violation.impact)).map(violation => `article:${violation.id}:${violation.nodes.map(node => node.target.join(' ')).join('|')}`));
  assert.equal(errors.length, 0, `browser errors: ${errors.join('; ')}`);
  assert.equal(accessibilityFailures.length, 0, `serious accessibility violations: ${accessibilityFailures.join(', ')}`);
  console.log(JSON.stringify({ ok: true, screenshots: ['/tmp/achola-admin-mobile.png', '/tmp/achola-article-mobile.png'] }));
} finally { await browser.close(); }
