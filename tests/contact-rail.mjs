import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = (process.env.TEST_BASE_URL || 'https://achola-odhiambo-advocates.pages.dev').replace(/\/$/, '');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });

async function verifyRail(viewport) {
  const page = await browser.newPage({ viewport });
  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    const rail = page.locator('[data-contact-rail]');
    const toggle = page.locator('[data-contact-toggle]');
    const whatsapp = rail.locator('a[href^="https://wa.me/"]');
    const phone = rail.locator('a[href^="tel:"]');

    await assertVisible(whatsapp, 'WhatsApp');
    await assertVisible(phone, 'phone');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    const collapsed = await rail.boundingBox();

    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    await assertVisible(whatsapp, 'WhatsApp after expansion');
    await assertVisible(phone, 'phone after expansion');
    const expanded = await rail.boundingBox();
    assert.ok(expanded.x < collapsed.x, 'expanded rail must slide farther into view');

    await page.locator('main').click({ position: { x: 20, y: 20 } });
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true', 'outside clicks must not hide the rail');
    await assertVisible(whatsapp, 'WhatsApp after outside click');
    await assertVisible(phone, 'phone after outside click');

    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await assertVisible(whatsapp, 'WhatsApp after collapse');
    await assertVisible(phone, 'phone after collapse');
  } finally {
    await page.close();
  }
}

async function assertVisible(locator, name) {
  assert.equal(await locator.isVisible(), true, `${name} action must remain visible`);
  const box = await locator.boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, `${name} action must retain its layout`);
}

try {
  await verifyRail({ width: 1440, height: 900 });
  await verifyRail({ width: 390, height: 844 });
  console.log(JSON.stringify({ ok: true, viewports: ['desktop', 'mobile'] }));
} finally {
  await browser.close();
}
