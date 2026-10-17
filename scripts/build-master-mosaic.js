const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ffmpegPath = 'C:\\Users\\Marco\\.local\\bin\\ffmpeg.exe';
const resourcesDir = path.resolve('Resources');
const outputMediaDir = path.resolve('dist/_external/media');

// Step 1: Read all caption metadata
console.log('--- Step 1: Parsing all markdown captions ---');
const creativeCaptions = new Map();

function walkSync(dir, extFilter) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const f of list) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walkSync(full, extFilter));
    } else if (!extFilter || extFilter(f)) {
      results.push(full);
    }
  }
  return results;
}

const mdFiles = walkSync(resourcesDir, f => f.toLowerCase().endsWith('.md'));
for (const md of mdFiles) {
  const content = fs.readFileSync(md, 'utf8');
  const lines = content.split('\n');
  let currentFile = null;
  let currentAngle = '';
  let currentHeadline = '';
  let currentDesc = '';

  for (const line of lines) {
    const fileMatch = line.match(/###\s*(?:\d+\.\s*)?`([^`]+\.(?:png|jpg|mp4))`(?:\s*\(([^)]+)\))?/i);
    if (fileMatch) {
      if (currentFile) {
        creativeCaptions.set(currentFile.toLowerCase(), {
          angle: currentAngle,
          headline: currentHeadline,
          desc: currentDesc
        });
      }
      currentFile = fileMatch[1].trim();
      currentAngle = '';
      currentHeadline = '';
      currentDesc = '';
    } else {
      const aMatch = line.match(/\*\s*\*\*Angle:\*\*\s*(.+)/i);
      if (aMatch) currentAngle = aMatch[1].trim();
      const hMatch = line.match(/\*\s*\*\*Headline:\*\*\s*(.+)/i);
      if (hMatch) currentHeadline = hMatch[1].trim();
      const dMatch = line.match(/\*\s*\*\*Description:\*\*\s*(.+)/i);
      if (dMatch) currentDesc = dMatch[1].trim();
    }
  }
  if (currentFile) {
    creativeCaptions.set(currentFile.toLowerCase(), {
      angle: currentAngle,
      headline: currentHeadline,
      desc: currentDesc
    });
  }
}
console.log(`Loaded caption profiles for ${creativeCaptions.size} assets from markdown docs.`);

// Step 2: Discover and probe all media files
console.log('--- Step 2: Discovering and probing all media files in Resources/ ---');
const rawMediaFiles = walkSync(resourcesDir, f => /\.(png|jpg|jpeg|mp4)$/i.test(f));
console.log(`Found ${rawMediaFiles.length} media files.`);

function getPngDimensions(buf) {
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504E47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return null;
}

function getJpegDimensions(buf) {
  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xFF) break;
    const marker = buf[offset + 1];
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7)
      };
    }
    if (offset + 4 > buf.length) break;
    const len = buf.readUInt16BE(offset + 2);
    offset += 2 + len;
  }
  return null;
}

function getVideoDimensions(filePath) {
  try {
    execSync(`"${ffmpegPath}" -i "${filePath}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    const match = stderr.match(/Stream.*Video:.*, (\d+)x(\d+)/);
    if (match) {
      return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
    }
  }
  return { width: 1080, height: 1920 };
}

function cleanSlug(name) {
  return name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

const allItems = [];
const seenFiles = new Set();

for (const filePath of rawMediaFiles) {
  const baseName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const relPath = path.relative(resourcesDir, filePath).replace(/\\/g, '/');
  
  if (seenFiles.has(filePath)) continue;
  seenFiles.add(filePath);

  const buf = ext === '.mp4' ? null : fs.readFileSync(filePath);
  let dims = null;
  if (ext === '.png') dims = getPngDimensions(buf);
  else if (ext === '.jpg' || ext === '.jpeg') dims = getJpegDimensions(buf);
  else if (ext === '.mp4') dims = getVideoDimensions(filePath);

  if (!dims) dims = { width: 1080, height: 1080 };

  const isVideo = ext === '.mp4';
  const ratio = dims.width / dims.height;

  // Determine Category and Funnel
  let category = 'Social Media Ads';
  let funnel = 'Awareness';
  if (relPath.includes('Campaign_1_TOFU')) {
    category = 'TOFU: Cold Audience Discovery';
    funnel = 'Top of Funnel';
  } else if (relPath.includes('Campaign_2_MOFU')) {
    category = 'MOFU: Retargeting & Evaluation';
    funnel = 'Middle of Funnel';
  } else if (relPath.includes('Campaign_3_BOFU')) {
    category = 'BOFU: High-Intent Direct Conversion';
    funnel = 'Bottom of Funnel';
  } else if (relPath.includes('carouel')) {
    category = 'Educational Multi-Slide Carousel';
    funnel = 'Social Content';
  } else if (relPath.includes('posting')) {
    category = 'Daily Solar Community Insights';
    funnel = 'Organic Engagement';
  } else if (isVideo) {
    category = 'High-Impact Video Commercial';
    funnel = 'Video Ad Creative';
  }

  // Determine Title, Headline, and Angle
  const cap = creativeCaptions.get(baseName.toLowerCase());
  let title = '';
  let headline = '';
  let angle = '';

  if (cap && cap.headline) {
    title = cap.headline;
    headline = cap.headline;
    angle = cap.angle || cap.desc;
  } else {
    // Generate clean descriptive title
    if (isVideo) {
      if (baseName.toLowerCase().startsWith('1')) {
        title = 'Balcony Solar DIY Kit 30s Quick Setup';
        angle = 'Watch 30-Minute DIY Installation on Condo Balcony';
      } else if (baseName.toLowerCase().startsWith('final')) {
        title = 'Turnkey Commercial & Residential Solar Installation';
        angle = 'Engineered Rooftop Systems Across Metro Manila';
      } else {
        title = 'High-Yield Suncake Portable Solar Showcase';
        angle = 'Real-Time App Telemetry & Power Generation';
      }
    } else {
      let cleaned = baseName
        .replace(/\.[^/.]+$/, '')
        .replace(/_2K_\d+/g, '')
        .replace(/_1080p_\d+/g, '')
        .replace(/copy/gi, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      angle = category;
    }
  }

  // Ensure unique web file path
  const slug = cleanSlug(baseName);
  const webExt = isVideo ? '.webm' : '.webp';
  const outFileName = `${slug}${webExt}`;
  const webPath = `/_external/media/${outFileName}`;

  allItems.push({
    filePath,
    baseName,
    relPath,
    isVideo,
    width: dims.width,
    height: dims.height,
    ratio: Number(ratio.toFixed(3)),
    category,
    funnel,
    title,
    headline,
    angle,
    src: webPath,
    slug
  });
}

console.log(`Indexed ${allItems.length} unique assets.`);

// Step 3: Determine Tile Spans based on Aspect Ratio and Marketing Priority
// Ratios:
// - ~0.56 (9:16 vertical video): tall or large
// - ~0.67 (2:3 vertical image): tall
// - 1.0 (square): normal (1x3), or wide/large for key hero conversions
console.log('--- Step 3: Assigning dynamic aspect-ratio spans ---');

let tallCount = 0;
let wideCount = 0;
let largeCount = 0;
let normalCount = 0;

allItems.forEach((item, idx) => {
  if (item.isVideo) {
    // Videos are high impact
    if (idx === 0 || item.title.includes('Commercial')) {
      item.span = 'large'; // 2 cols x 4 rows
      item.featured = true;
      largeCount++;
    } else {
      item.span = 'tall'; // 1 col x 4 rows (matches 9:16 vertical video!)
      item.featured = false;
      tallCount++;
    }
  } else if (item.ratio < 0.75) {
    // Vertical images
    item.span = 'tall';
    item.featured = false;
    tallCount++;
  } else {
    // Square or landscape images (ratio >= 0.75)
    // Select hero creatives for 'large' and 'wide' to give a dynamic, varied masonry
    const lowerTitle = item.title.toLowerCase();
    const isHeroPromo = lowerTitle.includes('45,000') || lowerTitle.includes('55k') || 
                        lowerTitle.includes('slashing') || lowerTitle.includes('calculator') || 
                        lowerTitle.includes('emergency') || lowerTitle.includes('powerplants');

    if (isHeroPromo && largeCount < 8) {
      item.span = 'large';
      item.featured = true;
      largeCount++;
    } else if (idx % 11 === 0 && wideCount < 10) {
      item.span = 'wide';
      item.featured = false;
      wideCount++;
    } else {
      item.span = 'normal';
      item.featured = false;
      normalCount++;
    }
  }
});

console.log(`Span summary: normal=${normalCount}, tall=${tallCount}, wide=${wideCount}, large=${largeCount}`);

// Convert all items to Framer component schema
const framerItems = allItems.map((item, index) => ({
  category: item.category,
  featured: item.featured,
  file: item.src,
  label: `${item.title} — ${item.angle}`,
  source: 'upload',
  span: item.span,
  title: item.title,
  url: '',
  year: '2026'
}));

fs.writeFileSync('scripts/master_mosaic_items.json', JSON.stringify(framerItems, null, 2));
console.log(`Saved ${framerItems.length} items to scripts/master_mosaic_items.json`);

// Step 4: Update shared-lib.DWgExkQF.mjs
console.log('--- Step 4: Injecting items and config into shared-lib.DWgExkQF.mjs ---');
const sharedLibPath = path.resolve('dist/_external/framerusercontent.com/sites/2ej2QXIWjTLE3dtrtWou7u/shared-lib.DWgExkQF.mjs');
let sharedLib = fs.readFileSync(sharedLibPath, 'utf8');

// Set featureMode:`manual` to strictly follow each tile's span
sharedLib = sharedLib.replace(/featureMode:`automatic`/g, 'featureMode:`manual`');

// Set enableFilter:!1 so Framer does not render the top tag filter bar
sharedLib = sharedLib.replace(/enableFilter:!0/g, 'enableFilter:!1');

// Update focus view to render img for webp
const focusVideoRegex = /p\(`video`,{className:`v-media`,src:bo\(e\.src\),preload:`metadata`,muted:!0,playsInline:!0,"aria-label":e\.label}\)/g;
sharedLib = sharedLib.replace(focusVideoRegex, 'e.src.endsWith(".webp")?p(`img`,{className:`v-media`,src:e.src,alt:e.label}):p(`video`,{className:`v-media`,src:bo(e.src),preload:`metadata`,muted:!0,playsInline:!0,"aria-label":e.label})');

// Locate items array
const startMarker = 'hoverZoom:1.02,id:`HO5yGRC1K`,inspectionCursor:!1,items:';
const endMarker = '],layoutId:`HO5yGRC1K`';

const startIdx = sharedLib.indexOf(startMarker);
if (startIdx !== -1) {
  const afterStart = startIdx + startMarker.length;
  const endIdx = sharedLib.indexOf(endMarker, afterStart);
  if (endIdx !== -1) {
    const itemsJson = JSON.stringify(framerItems);
    sharedLib = sharedLib.slice(0, afterStart) + itemsJson + sharedLib.slice(endIdx + 1);
    fs.writeFileSync(sharedLibPath, sharedLib, 'utf8');
    console.log('Successfully updated shared-lib.DWgExkQF.mjs with master items array!');
  } else {
    console.error('Failed to find endMarker in shared-lib.DWgExkQF.mjs');
  }
} else {
  console.error('Failed to find startMarker in shared-lib.DWgExkQF.mjs');
}

// Step 5: Update dist/index.html SSR pre-rendered HTML
console.log('--- Step 5: Updating dist/index.html SSR pre-rendered DOM ---');
const indexPath = path.resolve('dist/index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Build pre-rendered DOM
const preRenderedList = framerItems.map((tile, i) => {
  const mediaHtml = tile.file.endsWith('.webm')
    ? `<video class="v-media" src="${tile.file}" autoplay loop muted playsinline preload="metadata" data-playing="true"></video>`
    : `<img class="v-media" src="${tile.file}" alt="${tile.title.replace(/"/g, '&quot;')}" loading="lazy" />`;
  
  return `        <li class="v-item" data-span="${tile.span}" data-key="${i}-${tile.file}">
          <div class="v-hit">
            <div class="v-frame">
              ${mediaHtml}
              <div class="v-cap-overlay">
                <p class="v-title">${tile.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                <p class="v-meta">${tile.category} · 2026</p>
              </div>
            </div>
          </div>
        </li>`;
}).join('\n');

const gridStart = '<ul class="v-grid">';
const gridEnd = '</ul>';
const gStartIdx = indexHtml.indexOf(gridStart);
if (gStartIdx !== -1) {
  const gEndIdx = indexHtml.indexOf(gridEnd, gStartIdx);
  if (gEndIdx !== -1) {
    indexHtml = indexHtml.slice(0, gStartIdx + gridStart.length) + '\n' + preRenderedList + '\n      ' + indexHtml.slice(gEndIdx);
    fs.writeFileSync(indexPath, indexHtml, 'utf8');
    console.log('Successfully updated dist/index.html pre-rendered mosaic grid!');
  }
}

console.log('=== Master mosaic assembly completed! ===');
