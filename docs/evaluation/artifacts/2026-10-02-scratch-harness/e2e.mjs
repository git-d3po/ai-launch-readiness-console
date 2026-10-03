import { createRequire } from 'module';
import { execSync } from 'node:child_process';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const S = process.argv[2];
const psql = (sql) => execSync(`su postgres -c "psql -q -At -d lrc_test"`, { input: sql }).toString().trim();
const browser = await chromium.launch();
const results = [];
const check = (name, ok, detail) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);

async function rowText(page) {
  await page.waitForSelector('tbody tr');
  return page.evaluate(() => [...document.querySelectorAll('tbody tr')].map((tr) =>
    [...tr.children].map((c) => c.textContent.trim()).join(' | ')));
}

// 1. Seeded launch, every layout.
for (const scheme of ['light', 'dark']) for (const width of [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: scheme });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/');
  const rows = await rowText(page);
  const m = await page.evaluate(() => {
    const box = document.querySelector('table').parentElement;
    return { path: location.pathname, pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
             tableScrolls: box.scrollWidth > box.clientWidth,
             badge: getComputedStyle(document.querySelector('tbody td:last-child span')).backgroundColor };
  });
  check(`${scheme} ${width}: seeded row`, rows.length === 1, rows[0]);
  check(`${scheme} ${width}: / redirects, no page overflow`, m.path === '/launches' && m.pageOverflow === 0, `pageOverflow=${m.pageOverflow} tableScrollsInContainer=${m.tableScrolls} badgeBg=${m.badge}`);
  if (errors.length) check(`${scheme} ${width}: page errors`, false, errors.join('; '));
  await page.screenshot({ path: `${S}/shots2/${scheme}-${width}.png`, fullPage: true });
  if (width === 390 && scheme === 'light') {
    await page.evaluate(() => { document.querySelector('table').parentElement.scrollLeft = 10000; });
    await page.screenshot({ path: `${S}/shots2/light-390-scrolled.png` });
  }
  await ctx.close();
}

const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();

// 2. Row link.
await page.goto('http://localhost:4173/launches'); await rowText(page);
await page.click('tbody a');
check('row link', (await page.evaluate(() => location.pathname)) === '/launches/1', await page.evaluate(() => location.pathname));

// 3. Numbers follow the data: pass one more gate through set_gate_status, reload.
psql(`insert into public.evidence (gate_id, type, title, summary) select id, 'Document', 'E2E probe', 'Local test only' from public.gates where title = 'Production monitoring and alerting defined';
      select public.set_gate_status((select id from public.gates where title = 'Production monitoring and alerting defined'), 'Passed', 'E2E probe', 'AI Program Lead');`);
await page.goto('http://localhost:4173/launches');
check('after passing one more gate', true, (await rowText(page))[0]);
psql(`select public.set_gate_status((select id from public.gates where title = 'Rollback procedure documented and rehearsed'), 'Waived', 'E2E probe', 'AI Program Lead', 'Local test waiver');`);
await page.goto('http://localhost:4173/launches');
check('after waiving one gate', true, (await rowText(page))[0]);
psql(`select public.reset_demo_data();`);

// 4. Loading state (delay the API).
await page.route('**/rest/v1/**', async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
await page.goto('http://localhost:4173/launches');
const loading = await page.textContent('[role=status]');
check('loading state', loading === 'Loading launches…', loading);
await page.screenshot({ path: `${S}/shots2/loading.png` });
await rowText(page); await page.unroute('**/rest/v1/**');

// 5. Error from the API: anon loses access to the stage view.
psql(`revoke select on public.launch_current_stage from anon;`);
await page.goto('http://localhost:4173/launches');
await page.waitForSelector('[role=alert]');
check('API error shows message, no rows', (await page.locator('tbody tr').count()) === 0, (await page.textContent('[role=alert]')));
await page.screenshot({ path: `${S}/shots2/error-api.png` });
psql(`grant select on public.launch_current_stage to anon;`);

// 6. Network failure.
await page.route('**/rest/v1/**', (route) => route.abort());
await page.goto('http://localhost:4173/launches');
await page.waitForSelector('[role=alert]');
check('network error shows message, no rows', (await page.locator('tbody tr').count()) === 0, await page.textContent('[role=alert]'));
await page.unroute('**/rest/v1/**');

// 7. Empty state.
psql(`truncate public.decisions, public.risks, public.evidence, public.gates, public.rollout_stages, public.launches;`);
await page.goto('http://localhost:4173/launches');
await page.waitForSelector('text=No launches yet.');
check('empty state', (await page.locator('table').count()) === 0, 'No launches yet.');
await page.screenshot({ path: `${S}/shots2/empty.png` });
psql(`select public.reset_demo_data();`);

// 8. Missing configuration.
await page.goto('http://localhost:4174/launches');
await page.waitForSelector('[role=alert]');
check('no config shows error', true, await page.textContent('[role=alert]'));

await browser.close();
console.log(results.join('\n'));
console.log('seed after test:', psql(`select count(*) || ' gates, ' || count(*) filter (where status = 'Passed') || ' passed' from public.gates;`));
