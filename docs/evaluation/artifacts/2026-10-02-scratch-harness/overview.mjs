import { createRequire } from 'module';
import { execSync } from 'node:child_process';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const S = process.argv[2];
const psql = (sql) => execSync(`su postgres -c "psql -q -At -d lrc_test"`, { input: sql }).toString().trim();
const B = 'http://localhost:4173';
const browser = await chromium.launch();
const log = [];
const ok = (name, pass, detail = '') => log.push(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);

const read = (page) => page.evaluate(() => {
  const sec = (t) => [...document.querySelectorAll('section')].find((s) => s.querySelector('h2').textContent.startsWith(t));
  return {
    h1: document.querySelector('h1').textContent,
    chip: document.querySelector('header span')?.textContent ?? null,
    meta: [...document.querySelectorAll('header dl > div')].map((d) => d.textContent).join(' | '),
    sectionOrder: [...document.querySelectorAll('section h2')].map((h) => h.childNodes[0].textContent),
    blockingCount: sec('Blocking').querySelector('h2 span')?.textContent ?? null,
    blocking: [...sec('Blocking').querySelectorAll('li')].map((li) => li.querySelector('a').textContent + ' — ' + li.querySelector('p').textContent),
    blockingEmpty: sec('Blocking').querySelector('p:not(li p)')?.textContent ?? null,
    categories: [...sec('Gates').querySelectorAll('th[scope=colgroup]')].map((t) => t.textContent),
    gateRows: [...sec('Gates').querySelectorAll('tbody tr:not(:first-child)')].map((tr) => [...tr.children].map((c) => c.textContent).join(' | ')),
    chipColors: Object.fromEntries([...sec('Gates').querySelectorAll('td:last-child span')].map((s) => [s.textContent, getComputedStyle(s).backgroundColor])),
    risks: [...sec('Open high').querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent).join(' | ')),
    risksEmpty: sec('Open high').querySelector('p')?.textContent ?? null,
    stages: [...sec('Rollout').querySelectorAll('li')].map((li) => li.textContent),
    decisions: [...sec('Latest').querySelectorAll('li')].map((li) => [...li.children].map((c) => c.textContent).join(' | ')),
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

// 1. Seeded launch, all layouts.
let seeded;
for (const scheme of ['light', 'dark']) for (const width of [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(B + '/launches/1'); await page.waitForSelector('h1'); await page.waitForTimeout(300);
  const r = await read(page);
  seeded ??= r;
  ok(`${scheme} ${width} no page overflow, no errors`, r.pageOverflow === 0 && errs.length === 0, `overflow=${r.pageOverflow} ${errs.join(';')}`);
  await page.screenshot({ path: `${S}/shots4/${scheme}-${width}.png`, fullPage: true });
  await ctx.close();
}
log.push('--- seeded overview');
log.push('title: ' + seeded.h1 + ' [' + seeded.chip + '] ' + seeded.meta);
log.push('sections: ' + seeded.sectionOrder.join(' > '));
log.push(`blocking (${seeded.blockingCount}):\n  ` + seeded.blocking.join('\n  '));
log.push('categories: ' + seeded.categories.join(' > '));
log.push('gate rows: ' + seeded.gateRows.length + '; chip colors: ' + JSON.stringify(seeded.chipColors));
log.push('risks:\n  ' + seeded.risks.join('\n  '));
log.push('stages: ' + seeded.stages.join(' | '));
log.push('decisions:\n  ' + seeded.decisions.join('\n  '));

const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
// 2. Navigation.
await page.goto(B + '/launches'); await page.waitForSelector('tbody a'); await page.click('tbody a'); await page.waitForSelector('h1');
ok('list row -> overview', (await page.evaluate(() => location.pathname)) === '/launches/1');
await page.click('section a'); await page.waitForSelector('h1');
ok('gate link -> placeholder', /^\/launches\/1\/gates\/\d+$/.test(await page.evaluate(() => location.pathname)), (await page.evaluate(() => location.pathname)) + ' ' + await page.textContent('h1'));
for (const p of ['/launches/999', '/launches/abc']) {
  await page.goto(B + p); await page.waitForSelector('h1');
  ok(`not found ${p}`, (await page.textContent('h1')) === 'Page not found');
}

// 3. Data drives it: waive a blocker, record a new rationale on another.
psql(`select public.set_gate_status((select id from public.gates where title = 'Rollback procedure documented and rehearsed'), 'Waived', 'E2E probe: rollback covered elsewhere', 'AI Program Lead', 'Local test waiver');
      select public.set_gate_status((select id from public.gates where title = 'Production monitoring and alerting defined'), 'In progress', 'E2E probe: dashboards drafted', 'AI Program Lead');`);
await page.goto(B + '/launches/1'); await page.waitForSelector('h1');
let r = await read(page);
ok('after waive', r.blockingCount === '9' && !r.blocking.some((b) => b.startsWith('Rollback')), `count=${r.blockingCount} meta=${r.meta}`);
log.push('  monitoring line: ' + r.blocking.find((b) => b.startsWith('Production monitoring')));
log.push('  newest decision: ' + r.decisions[0]);
log.push('  rollback chip: ' + r.gateRows.find((g) => g.startsWith('Rollback')));

// 4. Nothing blocks: pass/waive every blocker through set_gate_status.
psql(`select public.set_gate_status(g.id, 'Waived', 'E2E probe', 'AI Program Lead', 'Local test waiver')
      from public.gates g where g.required and g.status not in ('Passed', 'Waived');`);
await page.goto(B + '/launches/1'); await page.waitForSelector('h1');
r = await read(page);
ok('nothing blocks', r.chip === 'Ready' && r.blockingCount === '0', `${r.chip} | ${r.blockingEmpty} | ${r.meta}`);
psql(`select public.reset_demo_data();`);

// 5. Empty launch: no gates, risks, stages, or decisions.
const emptyId = psql(`insert into public.launches (name, description, owner) values ('Empty probe', 'Local test only', 'AI Program Lead') returning id;`);
await page.goto(B + '/launches/' + emptyId); await page.waitForSelector('h1');
r = await read(page);
ok('empty launch', r.chip === null && r.risksEmpty === 'No open high-impact risks.', `${r.blockingEmpty} | stages=${r.stages.length} | decisions=${r.decisions.length} | ${r.meta}`);
await page.screenshot({ path: `${S}/shots4/empty.png`, fullPage: true });
psql(`select public.reset_demo_data();`);

// 6. Loading and error.
await page.route('**/rest/v1/**', async (route) => { await new Promise((res) => setTimeout(res, 1500)); await route.continue(); });
await page.goto(B + '/launches/1');
ok('loading', (await page.textContent('[role=status]')) === 'Loading launch…');
await page.waitForSelector('h1'); await page.unroute('**/rest/v1/**');
psql(`revoke select on public.decisions from anon;`);
await page.goto(B + '/launches/1'); await page.waitForSelector('[role=alert]');
ok('API error shows message, nothing else', (await page.locator('section').count()) === 0, await page.textContent('[role=alert]'));
psql(`grant select on public.decisions to anon;`);

await browser.close();
log.push('seed after test: ' + psql(`select count(*) || ' gates, ' || count(*) filter (where status = 'Passed') || ' passed, ' || (select count(*) from public.launches) || ' launch' from public.gates;`));
console.log(log.join('\n'));
