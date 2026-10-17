/**
 * Universal Website Offline Archiver - Local Preview & Live Reload Server
 * Zero-dependency local Node.js HTTP server.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf'
};

const SSE_CLIENT_SCRIPT = `
<script data-offline-archiver-live-reload="true">
  (function() {
    try {
      const sse = new EventSource('/__live_reload');
      sse.onmessage = function(e) {
        if (e.data === 'reload') {
          console.log('[LiveReload] Changes detected, reloading...');
          window.location.reload();
        }
      };
      sse.onerror = function() {
        // SSE disconnected, will auto retry
      };
    } catch (e) {}
  })();
</script>
`;

function getQueryHash(searchParams) {
  const params = typeof searchParams === 'string' ? new URLSearchParams(searchParams) : searchParams;
  const sortedPairs = [];
  for (const [key, val] of params.entries()) {
    sortedPairs.push([key, val]);
  }
  sortedPairs.sort((a, b) => {
    if (a[0] === b[0]) return a[1].localeCompare(b[1]);
    return a[0].localeCompare(b[0]);
  });
  const queryString = sortedPairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return crypto.createHash('md5').update(queryString).digest('hex').slice(0, 10);
}

function createServer(distDir, options = {}) {
  const sseClients = new Set();

  let watcher = null;
  // Watch dist directory for changes if live reload enabled
  if (options.liveReload !== false && fs.existsSync(distDir)) {
    let reloadDebounceTimer = null;
    try {
      watcher = fs.watch(distDir, { recursive: true }, (eventType, filename) => {
        // Ignore logs or temp files
        if (filename && (filename.endsWith('.log') || filename.endsWith('.md'))) return;
        clearTimeout(reloadDebounceTimer);
        reloadDebounceTimer = setTimeout(() => {
          for (const client of sseClients) {
            client.write('data: reload\n\n');
          }
        }, 150);
      });
    } catch (err) {
      console.warn('LiveReload file watch warning:', err.message);
    }
  }

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // 1. Live Reload SSE endpoint
    if (pathname === '/__live_reload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write(': connected\n\n');
      sseClients.add(res);
      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    // 2. Telemetry / Analytics Endpoint Interception (Return 204 No Content immediately)
    if (
      pathname.includes('/cdn-cgi/rum') ||
      pathname.includes('/telemetry') ||
      pathname.includes('/analytics') ||
      pathname.includes('/beacon') ||
      pathname.includes('/events')
    ) {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
      res.end();
      return;
    }

    // 3. Resolve filesystem path
    // Clean URLs & Query Hash Resolution
    let relativePath = pathname.replace(/^\//, '');
    let targetPath = path.join(distDir, relativePath);

    // Check directory -> index.html
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
    }

    // Clean URL check (e.g. /about -> /about.html)
    if (!fs.existsSync(targetPath) && !path.extname(targetPath)) {
      if (fs.existsSync(`${targetPath}.html`)) {
        targetPath = `${targetPath}.html`;
      }
    }

    // Query hash check (e.g. logo.png?width=200 -> check logo_<hash>.png)
    if (parsedUrl.search && parsedUrl.search.length > 1) {
      const hash = getQueryHash(parsedUrl.searchParams);
      const ext = path.extname(targetPath);
      const dir = path.dirname(targetPath);
      const basename = path.basename(targetPath, ext);
      const hashedCandidate = path.join(dir, `${basename}_${hash}${ext}`);
      if (fs.existsSync(hashedCandidate)) {
        targetPath = hashedCandidate;
      }
    }

    // ES Module Fallback: .mjs <-> .js
    if (!fs.existsSync(targetPath)) {
      if (targetPath.endsWith('.mjs') && fs.existsSync(targetPath.replace(/\.mjs$/, '.js'))) {
        targetPath = targetPath.replace(/\.mjs$/, '.js');
      } else if (targetPath.endsWith('.js') && fs.existsSync(targetPath.replace(/\.js$/, '.mjs'))) {
        targetPath = targetPath.replace(/\.js$/, '.mjs');
      }
    }

    // 404 Not Found
    if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    // 4. File Serving & MIME detection
    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(targetPath);
    const totalSize = stat.size;

    // 5. HTTP Range Requests (HTTP 206) for video/audio/large assets
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        res.writeHead(416, {
          'Content-Range': `bytes */${totalSize}`
        });
        res.end();
        return;
      }

      const chunkSize = (end - start) + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });

      const stream = fs.createReadStream(targetPath, { start, end });
      stream.pipe(res);
      return;
    }

    // HTML files: Inject live reload script dynamically
    if (ext === '.html' || contentType.includes('text/html')) {
      let content = fs.readFileSync(targetPath, 'utf-8');
      if (options.liveReload !== false) {
        if (content.includes('</head>')) {
          content = content.replace('</head>', `${SSE_CLIENT_SCRIPT}</head>`);
        } else if (content.includes('</body>')) {
          content = content.replace('</body>', `${SSE_CLIENT_SCRIPT}</body>`);
        } else {
          content += SSE_CLIENT_SCRIPT;
        }
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(content),
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
      return;
    }

    // Regular file response
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': totalSize,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(targetPath).pipe(res);
  });

  server.on('close', () => {
    if (watcher) {
      try {
        watcher.close();
      } catch {}
    }
    for (const client of sseClients) {
      try {
        client.end();
      } catch {}
    }
    sseClients.clear();
  });

  return server;
}

// Module exports
module.exports = {
  createServer,
  MIME_TYPES,
  getQueryHash
};

// CLI entrypoint
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3000', 10);
  const distDir = path.resolve(process.cwd(), process.argv[2] || 'dist');

  if (!fs.existsSync(distDir)) {
    console.warn(`[Warning] Directory "${distDir}" does not exist yet. Please run "node archive-site.js <url>" first.`);
  }

  const server = createServer(distDir, { liveReload: true });
  server.listen(port, () => {
    console.log(`\n🌐 Offline Archiver Local Server running at:`);
    console.log(`👉 http://localhost:${port}`);
    console.log(`📁 Serving directory: ${distDir}`);
    console.log(`⚡ Live reload: Active via Server-Sent Events (SSE)\n`);
  });
}
