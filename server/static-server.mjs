// Production server for the built single-page app (DR-027; reconciliation
// record, section 20, stage 4). No dependencies: node:http serves dist/.
//
//   npm run build && npm start
//
// - Serves files under dist/. Hashed files under /assets/ are cached for a
//   year; everything else, index.html included, is revalidated every time.
// - BrowserRouter fallback: a GET or HEAD for a path whose last segment has no
//   file extension (/launches, /launches/2/gates/30, /about) gets index.html.
//   A missing file with an extension (/assets/missing.js) is a real 404, so a
//   broken asset never comes back as HTML.
// - Never serves anything outside dist/: dot segments, encoded or not, and
//   NUL bytes are refused.
// - Every response carries the R-12 headers. The CSP is sent as
//   Content-Security-Policy-Report-Only until R-13's clean pass. Its
//   connect-src is the origin of VITE_SUPABASE_URL, read at start-up, so the
//   project's URL lives in the host's configuration, not in this repository.
//   The server refuses to start without an https URL there.
// - Listens on 0.0.0.0 and the PORT the host assigns (default 3000).

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

// The origin the browser may connect to: the Supabase project, nothing else.
export function supabaseOrigin(url) {
  let parsed;
  try {
    parsed = new URL(url ?? '');
  } catch {
    throw new Error('VITE_SUPABASE_URL must be set to the project URL (https://...)');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('VITE_SUPABASE_URL must be an https URL');
  }
  return parsed.origin;
}

// R-12, with the CSP report-only (R-13). X-Frame-Options enforces the framing
// rule now, while the CSP's frame-ancestors only reports.
export function securityHeaders(origin) {
  const csp = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    `connect-src ${origin}`,
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join('; ');
  return {
    'Content-Security-Policy-Report-Only': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000',
    'X-Frame-Options': 'DENY',
  };
}

async function fileAt(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? info : null;
  } catch {
    return null;
  }
}

export function createHandler({ root, origin }) {
  const base = resolve(root);
  const headers = securityHeaders(origin);
  const index = join(base, 'index.html');

  const send = (res, status, extra, body) => {
    res.writeHead(status, { ...headers, ...extra });
    res.end(body);
  };

  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }, 'Method not allowed\n');
    }

    // The raw path, decoded but not normalized, so a dot segment is refused
    // rather than silently collapsed.
    let pathname;
    try {
      pathname = decodeURIComponent((req.url ?? '/').split('?')[0].split('#')[0]);
      if (!pathname.startsWith('/')) throw new Error('not an origin-form path');
    } catch {
      return send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad request\n');
    }
    if (pathname.includes('\0') || pathname.split('/').some((segment) => segment === '..' || segment === '.')) {
      return send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad request\n');
    }

    const target = resolve(base, '.' + normalize(pathname));
    if (target !== base && !target.startsWith(base + sep)) {
      return send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad request\n');
    }

    let file = target;
    let info = await fileAt(file);
    if (!info) {
      const last = pathname.split('/').pop() ?? '';
      if (extname(last) !== '') {
        return send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found\n');
      }
      file = index;
      info = await fileAt(file);
      if (!info) {
        return send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'The app is not built\n');
      }
    }

    const immutable = file.startsWith(join(base, 'assets') + sep);
    res.writeHead(200, {
      ...headers,
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).pipe(res);
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const origin = supabaseOrigin(process.env.VITE_SUPABASE_URL);
  const root = fileURLToPath(new URL('../dist', import.meta.url));
  const port = Number(process.env.PORT ?? 3000);
  createServer(createHandler({ root, origin })).listen(port, '0.0.0.0', () => {
    console.log(`Serving dist/ on 0.0.0.0:${port}; CSP report-only, connect-src ${origin}`);
  });
}
