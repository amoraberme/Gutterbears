/**
 * Universal Website Offline Archiver
 * Stack-Adaptive Offline Mirror & Local Sanitization Pipeline
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cheerio = require('cheerio');

/**
 * Sorts query parameters and returns an MD5 hash.
 * @param {URLSearchParams|string} searchParams
 * @returns {string} 8-character hex hash (or full hash)
 */
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

/**
 * Cleans a filename to be safe on Windows/POSIX filesystems.
 */
function sanitizeFileName(filename) {
  return filename.replace(/[:*?"<>|]/g, '_');
}

/**
 * Resolves a remote URL to its local target file path inside baseDir.
 * @param {string} rawUrl 
 * @param {string} baseDir 
 * @param {string} rootOrigin 
 * @returns {string} Absolute or baseDir-relative file path
 */
function getLocalPath(rawUrl, baseDir, rootOrigin) {
  let urlObj;
  try {
    urlObj = new URL(rawUrl, rootOrigin);
  } catch (err) {
    return path.join(baseDir, 'unresolved', sanitizeFileName(rawUrl));
  }

  const isSameOrigin = urlObj.origin === new URL(rootOrigin).origin;
  let targetPrefix = baseDir;

  if (!isSameOrigin) {
    // External/CDN resources saved inside dist/_external/<hostname>/<path>
    targetPrefix = path.join(baseDir, '_external', sanitizeFileName(urlObj.hostname));
  }

  let pathname = decodeURIComponent(urlObj.pathname);
  if (!pathname || pathname === '/') {
    pathname = '/index.html';
  } else if (pathname.endsWith('/')) {
    pathname = `${pathname}index.html`;
  }

  let dir = path.dirname(pathname);
  let ext = path.extname(pathname);
  let basename = path.basename(pathname, ext);

  // Check if force CSS extension needed (e.g. /css or /css2)
  if (urlObj.hostname.includes('fonts.googleapis.com') || pathname.endsWith('/css') || pathname.endsWith('/css2')) {
    ext = '.css';
  }

  // If page lacks extension and is on same origin, or is HTML document
  if (!ext && !pathname.endsWith('/')) {
    ext = '.html';
  }

  // Handle Query Parameter Hashing
  const search = urlObj.search;
  if (search && search.length > 1) {
    const hash = getQueryHash(urlObj.searchParams);
    basename = `${basename}_${hash}`;
  }

  const finalFileName = `${sanitizeFileName(basename)}${ext}`;
  // Normalize directories
  const normalizedDir = dir.split('/').filter(Boolean).map(sanitizeFileName).join(path.sep);
  return path.join(targetPrefix, normalizedDir, finalFileName);
}

/**
 * Checks whether a URL is a known tracking, telemetry, or analytics endpoint.
 */
const TRACKING_PATTERNS = [
  /google-analytics\.com/i,
  /googletagmanager\.com/i,
  /connect\.facebook\.net/i,
  /facebook\.com\/tr/i,
  /hotjar\.com/i,
  /cdn-cgi\/rum/i,
  /clarity\.ms/i,
  /segment\.(io|com)/i,
  /amplitude\.com/i,
  /mixpanel\.com/i,
  /ping\.framer\.com/i,
  /events\.framer\.com/i,
  /telemetry/i,
  /analytics/i,
  /doubleclick\.net/i
];

function isTrackingUrl(urlStr) {
  if (!urlStr) return false;
  return TRACKING_PATTERNS.some(pattern => pattern.test(urlStr));
}

function isTrackingInlineScript(content) {
  if (!content) return false;
  return (
    content.includes('google-analytics.com') ||
    content.includes('googletagmanager.com') ||
    content.includes('gtag(') ||
    content.includes('fbq(') ||
    content.includes('connect.facebook.net') ||
    content.includes('clarity.ms') ||
    content.includes('cdn-cgi/rum')
  );
}

/**
 * Offline Form Interceptor script that displays friendly offline success notification.
 */
const OFFLINE_FORM_SCRIPT = `
<script data-offline-archiver="true">
  // Offline Archiver Form Intercepted
  window.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('form').forEach(function(form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Offline Archiver] Form submission intercepted. Data:', new FormData(form));
        // Check for Webflow form success wrapper
        var wfDone = form.parentElement && form.parentElement.querySelector('.w-form-done');
        if (wfDone) {
          form.style.display = 'none';
          wfDone.style.display = 'block';
          return;
        }
        // Custom offline notice
        var notice = document.createElement('div');
        notice.className = 'offline-form-success';
        notice.style.padding = '12px';
        notice.style.margin = '10px 0';
        notice.style.backgroundColor = '#d4edda';
        notice.style.color = '#155724';
        notice.style.border = '1px solid #c3e6cb';
        notice.style.borderRadius = '4px';
        notice.innerText = 'Offline Mode: Form submission simulated successfully.';
        form.parentNode.insertBefore(notice, form.nextSibling);
      }, true);
    });
  });
</script>
`;

/**
 * Sanitizes HTML to neutralize tracking without breaking React hydration,
 * removes SRI attributes, strips builder badges, injects form mock.
 */
function sanitizeHtml(htmlContent, pageUrl, rootOrigin) {
  const $ = cheerio.load(htmlContent);

  // 1. Strip SRI attributes from script and link tags
  $('script[integrity], link[integrity]').removeAttr('integrity');
  $('script[crossorigin], link[crossorigin]').removeAttr('crossorigin');

  // 2. Neutralize Tracking Scripts (Keep DOM node to prevent React hydration mismatch, but empty src/content)
  $('script').each((_, el) => {
    const src = $(el).attr('src');
    const content = $(el).html();
    if (isTrackingUrl(src)) {
      $(el).removeAttr('src');
      $(el).removeAttr('srcset');
      $(el).empty();
      $(el).attr('data-neutralized-tracker', 'true');
    } else if (isTrackingInlineScript(content)) {
      $(el).empty();
      $(el).attr('data-neutralized-tracker', 'true');
    }
  });

  // Also neutralize tracking noscript / img beacons
  $('img, noscript').each((_, el) => {
    const src = $(el).attr('src');
    if (isTrackingUrl(src)) {
      $(el).removeAttr('src');
    }
  });

  // 3. White-labeling: Strip meta generator, builder badges, template suffix in title
  $('meta[name="generator"]').remove();
  $('.w-webflow-badge, #framer-badge, [data-framer-badge], #__framer-badge-container, .__framer-badge').remove();

  // Strip Framer-specific meta tags and search indexes
  $('meta[name="framer-search-index"], meta[name="framer-search-index-fallback"]').remove();
  $('meta[name*="framer" i], meta[property*="framer" i]').remove();

  // Clean Framer descriptions from meta tags
  $('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').each((_, el) => {
    const content = $(el).attr('content') || '';
    if (/made (with|in) framer/i.test(content)) {
      $(el).remove();
    }
  });

  // Remove Framer editorbar bootstrap scripts
  $('script').each((_, el) => {
    const content = $(el).html() || '';
    if (content.includes('__framer_force_showing_editorbar_since') || content.includes('framer.com/edit/init.mjs')) {
      $(el).remove();
    }
  });

  const titleEl = $('title');
  if (titleEl.length > 0) {
    let titleText = titleEl.text();
    titleText = titleText.replace(/\s*[-|•]\s*(Built with|Made in|Created with)\s*(Framer|Webflow|Shopify|WordPress)/gi, '');
    titleEl.text(titleText);
  }

  // Clean canonical and og:url if pointing to framer domain
  $('link[rel="canonical"], meta[property="og:url"]').each((_, el) => {
    const val = $(el).attr('href') || $(el).attr('content') || '';
    if (val.includes('framer.website') || val.includes('framer.com')) {
      if ($(el).attr('href')) $(el).attr('href', './index.html');
      if ($(el).attr('content')) $(el).attr('content', './index.html');
    }
  });

  // Remove category filter bar from navigation (Portraits, Objects, Architecture, Places, All)
  $('.v-filters, [aria-label="Filter by category"]').remove();

  // Remove Framer comments like <!-- Made in Framer · framer.com ✨ -->
  let cleanedHtml = $.html();
  cleanedHtml = cleanedHtml.replace(/<!--\s*Made in Framer[^>]*-->/gi, '');
  cleanedHtml = cleanedHtml.replace(/<!--\s*Published [^>]*-->/gi, '');
  // Remove badge container css styles
  cleanedHtml = cleanedHtml.replace(/#__framer-badge-container\s*\{[^}]*\}/gi, '');
  cleanedHtml = cleanedHtml.replace(/@supports\s*\([^{]+\)\s*\{\s*#__framer-badge-container\s*\{[^}]*\}\s*\}/gi, '');

  const $final = cheerio.load(cleanedHtml);

  // 4. Inject offline form interceptor in <head>
  if ($final('head').length > 0) {
    $final('head').append(OFFLINE_FORM_SCRIPT);
  } else {
    $final('body').prepend(OFFLINE_FORM_SCRIPT);
  }

  return $final.html();
}

/**
 * Detects the frontend framework and stack signals from HTML and asset URLs.
 */
function detectStack(html, assetUrls = []) {
  const signals = [];
  let framework = 'Static HTML / Unknown';
  let confidence = 'low';

  const htmlLower = (html || '').toLowerCase();
  const urlStrings = (assetUrls || []).map(u => (typeof u === 'string' ? u : u.href || '')).join(' ');

  // Framer detection
  if (
    htmlLower.includes('framerusercontent.com') ||
    htmlLower.includes('framer-badge') ||
    htmlLower.includes('data-framer-name') ||
    urlStrings.includes('framerusercontent.com')
  ) {
    signals.push('Framer user content CDN', 'Framer component data attributes');
    framework = 'Framer';
    confidence = 'high';
  } else if (
    htmlLower.includes('__next_data__') ||
    htmlLower.includes('/_next/') ||
    urlStrings.includes('/_next/')
  ) {
    signals.push('__NEXT_DATA__ script payload', '/_next/ static chunk paths');
    framework = 'Next.js';
    confidence = 'high';
  } else if (
    htmlLower.includes('__nuxt__') ||
    htmlLower.includes('/_nuxt/') ||
    htmlLower.includes('_payload.json') ||
    urlStrings.includes('/_nuxt/')
  ) {
    signals.push('__NUXT__ state', '/_nuxt/ static bundles', '_payload.json endpoints');
    framework = 'Nuxt';
    confidence = 'high';
  } else if (
    htmlLower.includes('data-astro-cid') ||
    htmlLower.includes('astro-island')
  ) {
    signals.push('Astro island components', 'data-astro-cid styles');
    framework = 'Astro';
    confidence = 'high';
  } else if (
    htmlLower.includes('/_app/') ||
    htmlLower.includes('__sveltekit')
  ) {
    signals.push('SvelteKit /_app/ runtime bundles');
    framework = 'SvelteKit';
    confidence = 'high';
  } else if (
    htmlLower.includes('w-webflow-badge') ||
    htmlLower.includes('wf-page') ||
    htmlLower.includes('webflow.js')
  ) {
    signals.push('Webflow dataset attributes', 'webflow.js bundle');
    framework = 'Webflow';
    confidence = 'high';
  } else if (
    htmlLower.includes('wp-content') ||
    htmlLower.includes('wp-includes')
  ) {
    signals.push('WordPress wp-content asset structure');
    framework = 'WordPress';
    confidence = 'high';
  }

  return { framework, confidence, signals };
}

/**
 * Rewrites CSS @import and url(...) declarations to point to local mirror equivalents.
 */
function rewriteCssUrls(cssContent, cssUrl, rootOrigin, baseDir) {
  if (!cssContent) return '';
  return cssContent.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, quote, rawTarget) => {
    let cleanTarget = rawTarget.trim();
    if (cleanTarget.startsWith('data:') || cleanTarget.startsWith('#')) {
      return match;
    }
    try {
      const resolvedTarget = new URL(cleanTarget, cssUrl).href;
      const targetLocal = getLocalPath(resolvedTarget, baseDir, rootOrigin);
      const cssLocal = getLocalPath(cssUrl, baseDir, rootOrigin);
      let relative = path.relative(path.dirname(cssLocal), targetLocal).replace(/\\/g, '/');
      if (!relative.startsWith('.') && !relative.startsWith('/')) {
        relative = `./${relative}`;
      }
      return `url("${relative}")`;
    } catch {
      return match;
    }
  });
}

/**
 * Rewrites JS bundles replacing remote CDN URLs with root-relative /_external/ paths.
 */
function rewriteJsUrls(jsContent) {
  if (!jsContent) return '';
  let rewritten = jsContent;

  // Rewrite Framer CDN
  rewritten = rewritten.replace(/https:\/\/framerusercontent\.com\//g, '/_external/framerusercontent.com/');
  // Rewrite Google Fonts CDN
  rewritten = rewritten.replace(/https:\/\/fonts\.gstatic\.com\//g, '/_external/fonts.gstatic.com/');
  rewritten = rewritten.replace(/https:\/\/fonts\.googleapis\.com\//g, '/_external/fonts.googleapis.com/');

  // Neutralize filter bar rendering (All, Portraits, Objects, Architecture, Places)
  rewritten = rewritten.replace(/enableFilter&&/g, 'false&&');

  return rewritten;
}

/**
 * Concurrent Worker Queue Scheduler for archival pipeline
 */
class CrawlerQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 6;
    this.rootOrigin = options.rootOrigin;
    this.baseDir = options.baseDir || path.resolve(process.cwd(), 'dist');
    this.queue = [];
    this.activeWorkers = 0;
    this.visitedUrls = new Set();
    this.discoveredPages = new Set();
    this.discoveredAssets = new Set();
    this.localizedHosts = new Set();
    this.errors = [];
    this.onProgress = options.onProgress || (() => {});
  }

  enqueue(type, url, referrer = '') {
    try {
      const cleanUrl = new URL(url, referrer || this.rootOrigin);
      cleanUrl.hash = ''; // strip fragment
      const fullUrl = cleanUrl.href;

      if (this.visitedUrls.has(fullUrl)) {
        return;
      }

      // Check same-origin constraint for pages
      if (type === 'page') {
        if (cleanUrl.origin !== new URL(this.rootOrigin).origin) {
          return;
        }
        this.discoveredPages.add(fullUrl);
      } else {
        this.discoveredAssets.add(fullUrl);
      }

      if (cleanUrl.origin !== new URL(this.rootOrigin).origin) {
        this.localizedHosts.add(cleanUrl.hostname);
      }

      this.visitedUrls.add(fullUrl);
      this.queue.push({ type, url: fullUrl, referrer });
    } catch {
      // invalid URL
    }
  }

  async run(taskHandler) {
    return new Promise((resolve) => {
      const checkDrain = () => {
        if (this.queue.length === 0 && this.activeWorkers === 0) {
          resolve();
          return true;
        }
        return false;
      };

      const pump = () => {
        if (checkDrain()) return;

        while (this.activeWorkers < this.concurrency && this.queue.length > 0) {
          const task = this.queue.shift();
          this.activeWorkers++;
          this.onProgress(task, this.queue.length, this.activeWorkers);

          taskHandler(task)
            .catch((err) => {
              this.errors.push({ url: task.url, error: err.message, time: new Date().toISOString() });
            })
            .finally(() => {
              this.activeWorkers--;
              pump();
            });
        }
      };

      pump();
    });
  }
}

/**
 * Downloads a URL and returns Buffer and headers.
 */
async function fetchResource(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*'
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const contentType = res.headers.get('content-type') || '';
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType, status: res.status };
}

/**
 * Main crawl & archive orchestrator
 */
async function archiveSite(targetUrl, baseDir = path.resolve(process.cwd(), 'dist')) {
  console.log(`\n🚀 Starting Universal Website Offline Archiver`);
  console.log(`🎯 Target: ${targetUrl}`);
  console.log(`📁 Destination: ${baseDir}\n`);

  fs.mkdirSync(baseDir, { recursive: true });

  const rootUrlObj = new URL(targetUrl);
  const rootOrigin = rootUrlObj.origin;

  const crawler = new CrawlerQueue({
    concurrency: 8,
    rootOrigin,
    baseDir,
    onProgress: (task, remaining, active) => {
      // Optional logging hook
    }
  });

  let detectedFrameworkInfo = null;

  // Enqueue root page
  crawler.enqueue('page', targetUrl);

  await crawler.run(async (task) => {
    const { type, url } = task;
    try {
      const { buffer, contentType } = await fetchResource(url);
      const localFilePath = getLocalPath(url, baseDir, rootOrigin);
      fs.mkdirSync(path.dirname(localFilePath), { recursive: true });

      if (type === 'page' || contentType.includes('text/html')) {
        const rawHtml = buffer.toString('utf-8');

        // Extract assets and links using Cheerio
        const $ = cheerio.load(rawHtml);
        const discoveredAssetUrls = [];

        // Scripts
        $('script[src]').each((_, el) => {
          const src = $(el).attr('src');
          if (src && !isTrackingUrl(src)) {
            const assetUrl = new URL(src, url).href;
            discoveredAssetUrls.push(assetUrl);
            crawler.enqueue('asset', assetUrl, url);
          }
        });

        // Stylesheets & preloads
        $('link[href]').each((_, el) => {
          const href = $(el).attr('href');
          const rel = ($(el).attr('rel') || '').toLowerCase();
          if (href && !isTrackingUrl(href)) {
            const assetUrl = new URL(href, url).href;
            discoveredAssetUrls.push(assetUrl);
            crawler.enqueue('asset', assetUrl, url);
          }
        });

        // Images, SVGs, Media
        $('img[src], source[src], video[src], audio[src]').each((_, el) => {
          const src = $(el).attr('src');
          if (src && !src.startsWith('data:')) {
            const assetUrl = new URL(src, url).href;
            discoveredAssetUrls.push(assetUrl);
            crawler.enqueue('asset', assetUrl, url);
          }
          const srcset = $(el).attr('srcset');
          if (srcset) {
            srcset.split(',').forEach(item => {
              const part = item.trim().split(/\s+/)[0];
              if (part && !part.startsWith('data:')) {
                const assetUrl = new URL(part, url).href;
                discoveredAssetUrls.push(assetUrl);
                crawler.enqueue('asset', assetUrl, url);
              }
            });
          }
        });

        // Internal Links (Pages)
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
            try {
              const linkUrl = new URL(href, url);
              if (linkUrl.origin === rootOrigin) {
                crawler.enqueue('page', linkUrl.href, url);
              }
            } catch {}
          }
        });

        // Detect stack if root page
        if (!detectedFrameworkInfo) {
          detectedFrameworkInfo = detectStack(rawHtml, discoveredAssetUrls);
          console.log(`\n🔎 [Phase 1: Stack Detection]`);
          console.log(`   Framework: ${detectedFrameworkInfo.framework} (Confidence: ${detectedFrameworkInfo.confidence})`);
          console.log(`   Signals: ${detectedFrameworkInfo.signals.join(', ') || 'Standard DOM'}\n`);
        }

        // Check for stack-specific data files (Nuxt _payload.json, Next.js build manifests)
        if (detectedFrameworkInfo.framework === 'Nuxt') {
          crawler.enqueue('asset', new URL('_payload.json', url).href, url);
        }

        // Sanitize and rewrite HTML
        let sanitized = sanitizeHtml(rawHtml, url, rootOrigin);

        // Rewrite links and assets in HTML to local/relative paths
        const $clean = cheerio.load(sanitized);
        $clean('link[href]').each((_, el) => {
          const href = $clean(el).attr('href');
          if (href && !href.startsWith('data:') && !href.startsWith('#')) {
            try {
              const targetLocal = getLocalPath(new URL(href, url).href, baseDir, rootOrigin);
              const relative = path.relative(path.dirname(localFilePath), targetLocal).replace(/\\/g, '/');
              $clean(el).attr('href', relative.startsWith('.') ? relative : `./${relative}`);
            } catch {}
          }
        });

        $clean('script[src]').each((_, el) => {
          const src = $clean(el).attr('src');
          if (src && !src.startsWith('data:')) {
            try {
              const targetLocal = getLocalPath(new URL(src, url).href, baseDir, rootOrigin);
              const relative = path.relative(path.dirname(localFilePath), targetLocal).replace(/\\/g, '/');
              $clean(el).attr('src', relative.startsWith('.') ? relative : `./${relative}`);
            } catch {}
          }
        });

        $clean('img[src], source[src], video[src]').each((_, el) => {
          const src = $clean(el).attr('src');
          if (src && !src.startsWith('data:')) {
            try {
              const targetLocal = getLocalPath(new URL(src, url).href, baseDir, rootOrigin);
              const relative = path.relative(path.dirname(localFilePath), targetLocal).replace(/\\/g, '/');
              $clean(el).attr('src', relative.startsWith('.') ? relative : `./${relative}`);
            } catch {}
          }
        });

        fs.writeFileSync(localFilePath, $clean.html(), 'utf-8');
      } else {
        // Asset (CSS, JS, Fonts, Media, Images)
        const ext = path.extname(localFilePath).toLowerCase();

        if (ext === '.css') {
          let cssText = buffer.toString('utf-8');
          // Enqueue fonts/images inside CSS
          const urlMatches = cssText.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi);
          for (const match of urlMatches) {
            const rawTarget = match[2].trim();
            if (!rawTarget.startsWith('data:') && !rawTarget.startsWith('#')) {
              try {
                const subAssetUrl = new URL(rawTarget, url).href;
                crawler.enqueue('asset', subAssetUrl, url);
              } catch {}
            }
          }
          cssText = rewriteCssUrls(cssText, url, rootOrigin, baseDir);
          fs.writeFileSync(localFilePath, cssText, 'utf-8');
        } else if (ext === '.js' || ext === '.mjs') {
          let jsText = buffer.toString('utf-8');
          jsText = rewriteJsUrls(jsText);
          fs.writeFileSync(localFilePath, jsText, 'utf-8');
        } else {
          // Binary files: images, fonts, audio, video
          fs.writeFileSync(localFilePath, buffer);
        }
      }
    } catch (err) {
      crawler.errors.push({ url, error: err.message, time: new Date().toISOString() });
    }
  });

  // Write error logs
  const errorLogPath = path.resolve(process.cwd(), 'archive-errors.log');
  const errorLogContent = crawler.errors.map(e => `[${e.time}] FAILED: ${e.url} - ${e.error}`).join('\n');
  fs.writeFileSync(errorLogPath, errorLogContent, 'utf-8');

  // Write archive report
  const reportPath = path.resolve(process.cwd(), 'archive-report.md');
  const reportMd = `# Archive Report

**Target URL:** ${targetUrl}  
**Date:** ${new Date().toISOString()}  

## Stack Detection Summary
- **Detected Framework:** ${detectedFrameworkInfo ? detectedFrameworkInfo.framework : 'Unknown'}
- **Confidence:** ${detectedFrameworkInfo ? detectedFrameworkInfo.confidence : 'low'}
- **Evidence / Signals:**
${(detectedFrameworkInfo && detectedFrameworkInfo.signals.length > 0) ? detectedFrameworkInfo.signals.map(s => `  - ${s}`).join('\n') : '  - Standard HTML structure'}

## Crawl Statistics
- **Discovered Pages:** ${crawler.discoveredPages.size}
- **Mirrored Assets:** ${crawler.discoveredAssets.size}
- **Localized External CDNs / Hosts:** ${crawler.localizedHosts.size} (${Array.from(crawler.localizedHosts).join(', ') || 'None'})
- **Errors / Unresolved:** ${crawler.errors.length} (logged to \`archive-errors.log\`)

## Sanitization Performed
- Stripped Subresource Integrity (\`integrity\` and \`crossorigin\`)
- Neutralized telemetry & tracking scripts (safely emptied to prevent React hydration crash)
- Removed builder badges & CMS metadata
- Injected offline form interception handler

## Running Locally
To preview and edit the mirrored site:
\`\`\`bash
node server.js
\`\`\`
Visit [http://localhost:3000](http://localhost:3000).
`;

  fs.writeFileSync(reportPath, reportMd, 'utf-8');

  console.log(`\n✨ Archival Complete!`);
  console.log(`📄 Pages discovered: ${crawler.discoveredPages.size}`);
  console.log(`📦 Assets mirrored: ${crawler.discoveredAssets.size}`);
  console.log(`⚠️ Errors: ${crawler.errors.length}`);
  console.log(`📋 Report generated: archive-report.md`);
  console.log(`🪵 Error log: archive-errors.log\n`);
}

// Module exports for unit testing and library use
module.exports = {
  getQueryHash,
  getLocalPath,
  isTrackingUrl,
  isTrackingInlineScript,
  sanitizeHtml,
  detectStack,
  rewriteCssUrls,
  rewriteJsUrls,
  CrawlerQueue,
  fetchResource,
  archiveSite
};

// CLI Entrypoint
if (require.main === module) {
  let targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error('Usage: node archive-site.js <url>');
    process.exit(1);
  }
  // Strip trailing hash/fragment if accidentally passed in CLI like <url>#
  targetUrl = targetUrl.replace(/#.*$/, '');
  archiveSite(targetUrl).catch((err) => {
    console.error('Fatal error during archiving:', err);
    process.exit(1);
  });
}
