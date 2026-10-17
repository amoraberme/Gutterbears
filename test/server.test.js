const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { createServer } = require('../server.js');

test('Server: Clean URLs, Hashed Query, Telemetry, Range Requests & Live Reload', async (t) => {
  const testDist = path.join(__dirname, 'test-dist');
  fs.mkdirSync(testDist, { recursive: true });
  fs.mkdirSync(path.join(testDist, '_external', 'cdn.test.com'), { recursive: true });
  
  // Create sample files
  fs.writeFileSync(path.join(testDist, 'index.html'), '<html><head><title>Home</title></head><body>Home</body></html>');
  fs.writeFileSync(path.join(testDist, 'about.html'), '<html><head><title>About</title></head><body>About Us</body></html>');
  fs.writeFileSync(path.join(testDist, 'video.mp4'), Buffer.from('0123456789abcdefghijklmnopqrstuvwxyz'));
  fs.writeFileSync(path.join(testDist, 'logo_abc123.png'), 'fake-image-hash');
  fs.writeFileSync(path.join(testDist, 'logo.png'), 'fake-image-default');
  fs.writeFileSync(path.join(testDist, 'module.js'), 'export const a = 1;');

  const server = createServer(testDist, { liveReload: true });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
    fs.rmSync(testDist, { recursive: true, force: true });
  });

  // 1. Clean URL test: /about -> /about.html with live reload injected
  await test('resolves clean URLs and injects live reload into HTML', async () => {
    const res = await fetch(`${baseUrl}/about`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert(text.includes('About Us'));
    assert(text.includes('/__live_reload'));
  });

  // 2. Telemetry endpoint neutralization (204 No Content)
  await test('neutralizes telemetry endpoints with 204 No Content', async () => {
    const res1 = await fetch(`${baseUrl}/cdn-cgi/rum`);
    assert.strictEqual(res1.status, 204);

    const res2 = await fetch(`${baseUrl}/analytics/collect`);
    assert.strictEqual(res2.status, 204);
  });

  // 3. HTTP Range Requests (HTTP 206)
  await test('handles HTTP Range Requests (206 Partial Content)', async () => {
    const res = await fetch(`${baseUrl}/video.mp4`, {
      headers: { Range: 'bytes=0-5' }
    });
    assert.strictEqual(res.status, 206);
    assert.strictEqual(res.headers.get('content-range'), 'bytes 0-5/36');
    assert.strictEqual(res.headers.get('content-length'), '6');
    const text = await res.text();
    assert.strictEqual(text, '012345');
  });

  // 4. Hashed query param resolution fallback
  await test('resolves hashed query parameters or falls back', async () => {
    // If request has query string that matches logo_abc123.png
    // Or if parameter doesn't match an existing hash, falls back to logo.png
    const res = await fetch(`${baseUrl}/logo.png?v=nonexistent`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.strictEqual(text, 'fake-image-default');
  });

  // 5. ES Module Fallback
  await test('serves module with text/javascript MIME type', async () => {
    const res = await fetch(`${baseUrl}/module.mjs`);
    assert.strictEqual(res.status, 200);
    assert(res.headers.get('content-type').includes('javascript'));
    const text = await res.text();
    assert.strictEqual(text, 'export const a = 1;');
  });

  // 6. SSE endpoint test
  await test('serves SSE on /__live_reload', async () => {
    const res = await fetch(`${baseUrl}/__live_reload`);
    assert.strictEqual(res.status, 200);
    assert(res.headers.get('content-type').includes('text/event-stream'));
    res.body.cancel();
  });
});
