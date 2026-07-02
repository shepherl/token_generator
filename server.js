 const http = require('http');
    const https = require('https');

    const PORT = process.env.PORT || 3000;
    const API_HOST = 'api2.sec-tunnel.com';

    // Заголовки, которые не нужно пробрасывать в обе стороны
    const HOP_BY_HOP = new Set([
      'connection', 'keep-alive', 'proxy-authenticate',
      'proxy-authorization', 'te', 'trailer',
      'transfer-encoding', 'upgrade', 'host',
    ]);

    function filterHeaders(raw) {
      const out = {};
      for (const [key, value] of Object.entries(raw)) {
        if (!HOP_BY_HOP.has(key.toLowerCase())) {
          out[key] = value;
        }
      }
      return out;
    }

    const server = http.createServer((req, res) => {
      // Пропускаем только /v4/* — всё остальное отдаём 404
      if (!req.url.startsWith('/v4/')) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found. This relay only proxies /v4/* to api2.sec-tunnel.com.');
        return;
      }

      const fwdHeaders = filterHeaders(req.headers);
      fwdHeaders['host'] = API_HOST; // Устанавливаем правильный хост для Opera API

      const options = {
        hostname: API_HOST,
        port: 443,
        path: req.url,
        method: req.method,
        headers: fwdHeaders,
      };

      console.log(`[relay] ${req.method} ${req.url} -> https://${API_HOST}${req.url}`);

      const proxyReq = https.request(options, (proxyRes) => {
        const respHeaders = filterHeaders(proxyRes.headers);
        res.writeHead(proxyRes.statusCode, respHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error(`[relay] upstream error: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
        }
        res.end(`Upstream error: ${err.message}`);
      });

      // Если был запрос с телом (POST), передаем его
      req.pipe(proxyReq);
    });

    server.listen(PORT, () => {
      console.log(`[relay] Opera API relay listening on http://0.0.0.0:${PORT}`);
      console.log(`[relay] Proxying /v4/* -> https://${API_HOST}/v4/*`);
    });