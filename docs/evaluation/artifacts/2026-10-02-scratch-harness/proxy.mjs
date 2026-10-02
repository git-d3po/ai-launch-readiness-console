// Serves local PostgREST under /rest/v1 like Supabase. DELAY_MS simulates a slow network.
import http from 'node:http';
const delay = Number(process.env.DELAY_MS ?? 0);
http.createServer((req, res) => {
  const forward = () => {
    const path = req.url.replace(/^\/rest\/v1/, '') || '/';
    const up = http.request({ host: '127.0.0.1', port: 3000, path, method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode, r.headers); r.pipe(res);
    });
    up.on('error', (e) => { res.writeHead(502); res.end(e.message); });
    req.pipe(up);
  };
  setTimeout(forward, delay);
}).listen(Number(process.env.PORT ?? 54321));
