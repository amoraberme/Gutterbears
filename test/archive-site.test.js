const test = require('node:test');
const assert = require('node:assert');
const cheerio = require('cheerio');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const {
  getQueryHash,
  getLocalPath,
  sanitizeHtml,
  rewriteCssUrls,
  rewriteJsUrls,
  detectStack,
  isTrackingUrl,
  isTrackingInlineScript
} = require('../archive-site.js');

test('Test 1: URL path mapping and hashing', () => {
  const rootOrigin = 'https://example.com';
  const baseDir = '/dist';

  // Simple page mapping
  assert.strictEqual(
    getLocalPath('https://example.com/about', baseDir, rootOrigin).replace(/\\/g, '/'),
    '/dist/about.html'
  );

  // Directory mapping
  assert.strictEqual(
    getLocalPath('https://example.com/blog/', baseDir, rootOrigin).replace(/\\/g, '/'),
    '/dist/blog/index.html'
  );

  // Query parameter hashing
  const hash = getQueryHash(new URLSearchParams('width=200&height=100'));
  assert.strictEqual(
    getLocalPath('https://example.com/logo.png?width=200&height=100', baseDir, rootOrigin).replace(/\\/g, '/'),
    `/dist/logo_${hash}.png`
  );

  // Query parameter sorting consistency
  const hash2 = getQueryHash(new URLSearchParams('height=100&width=200'));
  assert.strictEqual(hash, hash2);

  // External mapping
  assert.strictEqual(
    getLocalPath('https://external-cdn.com/image.jpg', baseDir, rootOrigin).replace(/\\/g, '/'),
    '/dist/_external/external-cdn.com/image.jpg'
  );

  // CSS force extension when query or no extension
  assert.strictEqual(
    getLocalPath('https://fonts.googleapis.com/css2?family=Inter', baseDir, rootOrigin).replace(/\\/g, '/'),
    `/dist/_external/fonts.googleapis.com/css2_${getQueryHash(new URLSearchParams('family=Inter'))}.css`
  );
});

test('Test 2: HTML Sanitizer, SRI Stripper & Neutralization', () => {
  const htmlInput = `
    <html>
      <head>
        <title>My Site - Built with Framer</title>
        <meta name="generator" content="Framer 1234">
        <link rel="stylesheet" href="/style.css" integrity="sha384-xyz" crossorigin="anonymous">
        <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
      </head>
      <body>
        <div id="framer-badge">Badge</div>
        <script>console.log('google-analytics.com');</script>
        <form action="/submit" method="POST"><button type="submit">Send</button></form>
      </body>
    </html>
  `;

  const sanitized = sanitizeHtml(htmlInput, 'https://example.com', 'https://example.com/');
  const $ = cheerio.load(sanitized);

  // Assert SRI removed
  assert.strictEqual($('link[integrity]').length, 0);
  assert.strictEqual($('link[crossorigin]').length, 0);

  // Assert tracking script neutralized (kept in DOM to prevent React hydration crash, but src and content emptied)
  assert.strictEqual($('script[src*="facebook"]').length, 0); // src stripped
  assert.strictEqual($('script').filter((i, el) => $(el).html().includes('google-analytics.com')).length, 0); // inner content cleared
  // Script element itself is preserved
  assert.strictEqual($('script').length >= 2, true);

  // Badges and meta generator stripped
  assert.strictEqual($('meta[name="generator"]').length, 0);
  assert.strictEqual($('#framer-badge').length, 0);

  // Assert form mock script injected into head
  assert($('head').html().includes('Offline Archiver Form Intercepted'));
});

test('Test 3: CSS and JS URL Rewriter', () => {
  const css = `
    @import url("https://fonts.googleapis.com/css?family=Roboto");
    body { background: url('/images/bg.png?v=1'); }
    .icon { background-image: url('https://external-cdn.com/icon.svg'); }
  `;
  const rewrittenCss = rewriteCssUrls(css, 'https://example.com/assets/style.css', 'https://example.com', '/dist');
  assert(!rewrittenCss.includes('https://fonts.googleapis.com'));
  assert(!rewrittenCss.includes('https://external-cdn.com'));

  const js = `
    const cdnUrl = "https://framerusercontent.com/modules/test.js";
    const font = "https://fonts.gstatic.com/s/inter/v13.woff2";
  `;
  const rewrittenJs = rewriteJsUrls(js);
  assert(rewrittenJs.includes('/_external/framerusercontent.com/modules/test.js'));
  assert(rewrittenJs.includes('/_external/fonts.gstatic.com/s/inter/v13.woff2'));
});

test('Test 4: Stack detection', () => {
  const framerHtml = `<html><head><script src="https://framerusercontent.com/script.js"></script></head><body><div id="framer-badge"></div></body></html>`;
  const detected = detectStack(framerHtml, [new URL('https://framerusercontent.com/script.js')]);
  assert.strictEqual(detected.framework, 'Framer');

  const nextHtml = `<html><head><script id="__NEXT_DATA__" type="application/json">{}</script></head></html>`;
  const detectedNext = detectStack(nextHtml, []);
  assert.strictEqual(detectedNext.framework, 'Next.js');
});
