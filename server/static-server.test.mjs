// Tests for the production static server: SPA fallback, real 404s for
// assets, no path traversal, and the R-12 headers on every response.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHandler, securityHeaders, supabaseOrigin } from './static-server.mjs';

const ORIGIN = 'https://example-project.supabase.co';
let dir;
let server;
let port;

// A raw request, so paths like /../x reach the server unnormalized.
const get = (path, method = 'GET') =>
  new Promise((done, fail) => {
    const req = request({ host: '127.0.0.1', port, path, method }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', fail);
    req.end();
  });

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'dist-'));
  mkdirSync(join(dir, 'dist', 'assets'), { recursive: true });
  writeFileSync(join(dir, 'dist', 'index.html'), '<!doctype html><div id="root"></div>');
  writeFileSync(join(dir, 'dist', 'assets', 'index-abc.js'), 'console.log(1)');
  writeFileSync(join(dir, 'dist', 'assets', 'index-abc.css'), 'body{}');
  writeFileSync(join(dir, 'secret.txt'), 'outside dist');
  server = createServer(createHandler({ root: join(dir, 'dist'), origin: ORIGIN }));
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  port = server.address().port;
});

afterAll(() => {
  server?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('BrowserRouter fallback', () => {
  for (const path of ['/', '/launches', '/launches/2', '/launches/2/gates/30', '/about', '/launches/2/gates/30?x=1']) {
    it(`serves index.html for ${path}`, async () => {
      const res = await get(path);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(res.headers['cache-control']).toBe('no-cache');
      expect(res.body).toContain('<div id="root">');
    });
  }
});

describe('static files', () => {
  it('serves hashed assets with their type and a long cache', async () => {
    const js = await get('/assets/index-abc.js');
    expect(js.status).toBe(200);
    expect(js.headers['content-type']).toBe('text/javascript; charset=utf-8');
    expect(js.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(js.body).toBe('console.log(1)');
    expect((await get('/assets/index-abc.css')).headers['content-type']).toBe('text/css; charset=utf-8');
  });

  it('returns 404, not index.html, for a missing file with an extension', async () => {
    for (const path of ['/assets/missing.js', '/favicon.ico', '/launches/2/x.png']) {
      const res = await get(path);
      expect(res.status).toBe(404);
      expect(res.body).not.toContain('<div id="root">');
    }
  });

  it('answers HEAD without a body and refuses other methods', async () => {
    const head = await get('/launches', 'HEAD');
    expect(head.status).toBe(200);
    expect(head.body).toBe('');
    const post = await get('/launches', 'POST');
    expect(post.status).toBe(405);
    expect(post.headers.allow).toBe('GET, HEAD');
  });
});

describe('path safety', () => {
  for (const path of ['/../secret.txt', '/assets/../../secret.txt', '/%2e%2e/secret.txt', '/assets/%2e%2e%2f%2e%2e%2fsecret.txt', '/a%00b', '/%E0%A4%A']) {
    it(`refuses ${path}`, async () => {
      const res = await get(path);
      expect(res.status).toBe(400);
      expect(res.body).not.toContain('outside dist');
    });
  }
});

describe('security headers', () => {
  it('sends the R-12 set on every response, the CSP enforced', async () => {
    for (const path of ['/', '/assets/index-abc.js', '/assets/missing.js', '/../x']) {
      const { headers } = await get(path);
      expect(headers['content-security-policy-report-only']).toBeUndefined();
      expect(headers['content-security-policy']).toBe(
        "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; "
          + `connect-src ${ORIGIN}; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`,
      );
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
      expect(headers['strict-transport-security']).toBe('max-age=31536000');
      expect(headers['x-frame-options']).toBe('DENY');
    }
  });

  it('takes connect-src from the configured URL, as an origin only', () => {
    expect(supabaseOrigin('https://abc.supabase.co/')).toBe('https://abc.supabase.co');
    expect(supabaseOrigin('https://abc.supabase.co/rest/v1')).toBe('https://abc.supabase.co');
    expect(securityHeaders('https://abc.supabase.co')['Content-Security-Policy']).toContain(
      'connect-src https://abc.supabase.co;',
    );
    expect(securityHeaders('https://abc.supabase.co')).not.toHaveProperty('Content-Security-Policy-Report-Only');
  });

  it('refuses to start without an https Supabase URL', () => {
    expect(() => supabaseOrigin(undefined)).toThrow();
    expect(() => supabaseOrigin('')).toThrow();
    expect(() => supabaseOrigin('http://abc.supabase.co')).toThrow();
    expect(() => supabaseOrigin('abc.supabase.co')).toThrow();
  });
});
