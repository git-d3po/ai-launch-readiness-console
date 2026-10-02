import { createRequire } from 'module';
import { execSync } from 'node:child_process';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const S = process.argv[2];
const psql = (sql) => execSync(`su postgres -c "psql -q -At -d lrc_test"`, { input: sql }).toString().trim();
const browser = await chromium.launch();
const out = [];
for (const scheme of ['light', 'dark']) for (const width of [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 760 }, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/'); await page.waitForSelector('tbody tr');
  const r = await page.evaluate(() => {
    // Resolve any CSS color to sRGB via canvas, then compute WCAG contrast.
    const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
    const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const cs = (sel, p) => getComputedStyle(document.querySelector(sel))[p];
    const box = document.querySelector('table').parentElement;
    return {
      tokensResolve: ['--page', '--card', '--fg', '--muted', '--line', '--accent'].every((n) => rgb(v(n)).join() !== '0,0,0' || n === '--fg'),
      bodyBg: rgb(cs('body', 'backgroundColor')).join(','), cardBg: rgb(cs('table', 'backgroundColor') === 'rgba(0, 0, 0, 0)' ? getComputedStyle(box).backgroundColor : cs('table', 'backgroundColor')).join(','),
      fontSize: cs('body', 'fontSize'), numeric: cs('body', 'fontVariantNumeric'), font: cs('body', 'fontFamily').split(',')[0],
      contrast: {
        'fg/page': ratio(v('--fg'), v('--page')), 'fg/card': ratio(v('--fg'), v('--card')), 'muted/card': ratio(v('--muted'), v('--card')),
        'muted/page': ratio(v('--muted'), v('--page')), 'accent/card': ratio(v('--accent'), v('--card')), 'accent/accent-subtle': ratio(v('--accent'), v('--accent-subtle')),
        'badge': ratio(cs('tbody td:last-child span', 'color'), cs('tbody td:last-child span', 'backgroundColor')),
      },
      title: [...document.querySelector('main > div').children].map((e) => e.textContent).join(' + '),
      titleOneRow: (() => { const [h, c] = document.querySelector('main > div').children; return Math.abs(h.getBoundingClientRect().top - c.getBoundingClientRect().top) < 6; })(),
      row: [...document.querySelector('tbody tr').children].map((c) => c.textContent.trim()).join(' | '),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, tableScrolls: box.scrollWidth > box.clientWidth,
      badgeAnimation: cs('tbody td:last-child span', 'animationName') + ' ' + cs('tbody td:last-child span', 'animationDuration'),
      paragraphs: document.querySelectorAll('main p').length,
    };
  });
  out.push(`${scheme} ${width}: ${JSON.stringify(r)}`);
  await page.screenshot({ path: `${S}/shots3/${scheme}-${width}.png` });
  await ctx.close();
}
// Still computed: pass one more gate, reload, then reset.
const page = await (await browser.newContext({ viewport: { width: 1280, height: 700 } })).newPage();
psql(`insert into public.evidence (gate_id, type, title, summary) select id, 'Document', 'E2E probe', 'Local test only' from public.gates where title = 'Production monitoring and alerting defined';
      select public.set_gate_status((select id from public.gates where title = 'Production monitoring and alerting defined'), 'Passed', 'E2E probe', 'AI Program Lead');`);
await page.goto('http://localhost:4173/launches'); await page.waitForSelector('tbody tr');
out.push('after one more gate passes: ' + await page.evaluate(() => [...document.querySelector('tbody tr').children].map((c) => c.textContent.trim()).join(' | ')));
psql(`select public.reset_demo_data();`);
await page.goto('http://localhost:4173/launches'); await page.waitForSelector('tbody tr');
out.push('after reset: ' + await page.evaluate(() => [...document.querySelector('tbody tr').children].map((c) => c.textContent.trim()).join(' | ')));
// Reduced motion: no animation.
const rm = await (await browser.newContext({ reducedMotion: 'reduce' })).newPage();
await rm.goto('http://localhost:4173/launches'); await rm.waitForSelector('tbody tr');
out.push('reduced motion badge animation: ' + await rm.evaluate(() => getComputedStyle(document.querySelector('tbody td:last-child span')).animationName));
await browser.close();
console.log(out.join('\n'));
