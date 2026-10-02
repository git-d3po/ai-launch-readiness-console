import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const base = 'http://localhost:4173';
const out = process.argv[2];
const routes = ['/', '/launches', '/launches/1', '/launches/1/gates/1', '/launches/1/risks', '/launches/1/decisions', '/about', '/nope'];
const browser = await chromium.launch();
const problems = [];
for (const scheme of ['light', 'dark']) {
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: scheme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    for (const r of routes) {
      await page.goto(base + r); await page.waitForSelector('h1');
      const info = await page.evaluate(() => ({
        path: location.pathname,
        h1: document.querySelector('h1')?.textContent,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        footer: document.querySelector('footer')?.textContent?.trim(),
        reset: (() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent === 'Reset demo data'); return b ? b.disabled : 'missing'; })(),
        bg: getComputedStyle(document.body).backgroundColor,
      }));
      const line = `${scheme} ${width} ${r} -> ${info.path} | h1="${info.h1}" | overflowX=${info.overflow} | resetDisabled=${info.reset} | bg=${info.bg}`;
      if (info.overflow > 0 || !info.h1 || info.footer !== 'Synthetic portfolio data. No real customers or systems.' || info.reset !== true) problems.push(line);
      if (r === '/launches' || r === '/nope') await page.screenshot({ path: `${out}/${scheme}-${width}${r.replace(/\//g, '_')}.png` });
      if (width === 390 && r === '/launches') console.log(line);
    }
    // Keyboard: Tab order from the top of /launches.
    if (width === 390 && scheme === 'light') {
      await page.goto(base + '/launches');
      const order = [];
      for (let i = 0; i < 5; i++) { await page.keyboard.press('Tab'); order.push(await page.evaluate(() => document.activeElement?.textContent?.trim())); }
      console.log('tab order:', order.join(' > '));
      await page.goto(base + '/launches');
      await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      console.log('Enter on 4th tab stop ->', await page.evaluate(() => location.pathname));
    }
    if (errors.length) problems.push(`${scheme} ${width} console errors: ${errors.join('; ')}`);
    await ctx.close();
  }
}
await browser.close();
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'all routes ok: no page-level horizontal overflow, h1 present, footer present, reset disabled, no console errors');
