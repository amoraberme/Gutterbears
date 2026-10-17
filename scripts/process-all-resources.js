const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ffmpegPath = 'C:\\Users\\Marco\\.local\\bin\\ffmpeg.exe';
const resourcesDir = path.resolve('Resources');
const outputMediaDir = path.resolve('dist/_external/media');

if (!fs.existsSync(outputMediaDir)) {
  fs.mkdirSync(outputMediaDir, { recursive: true });
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

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
  return { width: 1280, height: 720 };
}

console.log('--- Step 1: Gathering and deduplicating media files ---');
const allFiles = walk(resourcesDir);
const mediaFiles = allFiles.filter(f => {
  const ext = path.extname(f).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.mp4'].includes(ext);
});

console.log(`Discovered ${mediaFiles.length} raw media files in Resources/`);

const hashes = new Map();
const uniqueItems = [];
const duplicates = [];

for (const file of mediaFiles) {
  const buf = fs.readFileSync(file);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  if (hashes.has(hash)) {
    duplicates.push({ file, duplicateOf: hashes.get(hash) });
  } else {
    hashes.set(hash, file);
    uniqueItems.push({ file, hash, size: buf.length, buf });
  }
}

console.log(`Unique media files: ${uniqueItems.length}`);
console.log(`Duplicate files removed: ${duplicates.length}`);

console.log('--- Step 2: Probing dimensions and aspect ratios ---');
const probedMedia = [];

for (const item of uniqueItems) {
  const ext = path.extname(item.file).toLowerCase();
  let dims = null;
  if (ext === '.png') {
    dims = getPngDimensions(item.buf);
  } else if (ext === '.jpg' || ext === '.jpeg') {
    dims = getJpegDimensions(item.buf);
  } else if (ext === '.mp4') {
    dims = getVideoDimensions(item.file);
  }

  if (!dims || !dims.width || !dims.height) {
    console.warn(`Could not probe dimensions for ${item.file}, using fallback 1080x1080`);
    dims = { width: 1080, height: 1080 };
  }

  const ratio = dims.width / dims.height;
  probedMedia.push({
    ...item,
    ext,
    width: dims.width,
    height: dims.height,
    ratio,
    isVideo: ext === '.mp4'
  });
}

console.log('--- Step 3: Transcoding all media to .webp and .webm ---');

function cleanSlug(str) {
  return str
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

const finalTiles = [];
let itemCounter = 1;

for (const item of probedMedia) {
  const relPath = path.relative(resourcesDir, item.file);
  const baseName = path.basename(item.file);
  const slug = cleanSlug(baseName);
  
  // Categorize by folder / funnel stage
  let category = 'Social Media Ads';
  let funnel = 'SMM Campaign';
  if (relPath.includes('Campaign_1_TOFU')) {
    category = 'TOFU: Brand Awareness & Education';
    funnel = 'Top of Funnel';
  } else if (relPath.includes('Campaign_2_MOFU')) {
    category = 'MOFU: Retargeting & Consideration';
    funnel = 'Middle of Funnel';
  } else if (relPath.includes('Campaign_3_BOFU')) {
    category = 'BOFU: High Intent & Direct Conversion';
    funnel = 'Bottom of Funnel';
  } else if (relPath.includes('carouel')) {
    category = 'Educational Carousel Set';
    funnel = 'Social Content';
  } else if (relPath.includes('posting')) {
    category = 'Feed & Community Postings';
    funnel = 'Daily Engagement';
  } else if (item.isVideo) {
    category = 'High-Impact Video Commercial';
    funnel = 'Video Ad';
  }

  // Generate clean title
  let title = baseName
    .replace(/\.[^/.]+$/, '')
    .replace(/_2K_\d+/g, '')
    .replace(/_1080p_\d+/g, '')
    .replace(/copy/gi, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Assign span according to aspect ratio and strategic importance
  let span = 'normal';
  if (item.isVideo) {
    // Videos make great hero/large and wide tiles
    if (item.ratio > 1.3) {
      span = itemCounter % 2 === 0 ? 'large' : 'wide';
    } else {
      span = 'tall';
    }
  } else if (item.ratio < 0.75) {
    span = 'tall'; // Vertical / Portrait / Story
  } else if (item.ratio > 1.35) {
    span = 'wide'; // Landscape / Banner
  } else {
    // Near 1:1 or standard
    // Inject occasional 'large' for featured ad sets to create natural mosaic variety
    if (itemCounter % 14 === 0 || title.toLowerCase().includes('promo') || title.toLowerCase().includes('slashing')) {
      span = 'large';
    } else {
      span = 'normal';
    }
  }

  let outFileName = '';
  let webPath = '';

  if (item.isVideo) {
    outFileName = `${slug}.webm`;
    const destPath = path.join(outputMediaDir, outFileName);
    webPath = `/_external/media/${outFileName}`;

    if (!fs.existsSync(destPath) || fs.statSync(destPath).size < 1000) {
      console.log(`Transcoding video -> ${outFileName}`);
      try {
        execSync(`"${ffmpegPath}" -y -i "${item.file}" -c:v libvpx-vp9 -b:v 800k -crf 33 -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -an -deadline realtime -cpu-used 4 "${destPath}"`, { stdio: 'inherit' });
      } catch (err) {
        console.error(`Failed to transcode ${item.file}:`, err.message);
      }
    } else {
      console.log(`Existing webm found: ${outFileName}`);
    }
  } else {
    outFileName = `${slug}.webp`;
    const destPath = path.join(outputMediaDir, outFileName);
    webPath = `/_external/media/${outFileName}`;

    if (!fs.existsSync(destPath) || fs.statSync(destPath).size < 1000) {
      // Scale down large images (e.g. 2400px down to max 1280px) to maximize web performance
      const scaleFilter = item.width > 1440 || item.height > 1440 
        ? `-vf "scale='min(1440,iw)':-1:force_original_aspect_ratio=decrease"` 
        : '';
      try {
        execSync(`"${ffmpegPath}" -y -i "${item.file}" ${scaleFilter} -c:v libwebp -quality 75 "${destPath}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (err) {
        console.error(`Failed to transcode ${item.file}:`, err.message);
      }
    }
  }

  finalTiles.push({
    id: `tile_${String(itemCounter).padStart(3, '0')}`,
    name: title,
    category: category,
    funnel: funnel,
    mediaType: item.isVideo ? 'video' : 'image',
    src: webPath,
    span: span,
    width: item.width,
    height: item.height,
    aspectRatio: Number(item.ratio.toFixed(3))
  });

  itemCounter++;
}

console.log(`Successfully generated ${finalTiles.length} total creative tiles.`);

// Count span distribution
const spanCounts = { normal: 0, tall: 0, wide: 0, large: 0 };
finalTiles.forEach(t => spanCounts[t.span]++);
console.log('Tile Span Distribution:', spanCounts);

// Save generated metadata to file
fs.writeFileSync('scripts/generated_tiles.json', JSON.stringify(finalTiles, null, 2));

console.log('--- Step 4: Updating shared-lib.DWgExkQF.mjs with new items ---');
const sharedLibPath = path.resolve('dist/_external/framerusercontent.com/sites/2ej2QXIWjTLE3dtrtWou7u/shared-lib.DWgExkQF.mjs');
let sharedLibContent = fs.readFileSync(sharedLibPath, 'utf8');

// The items array is in hoverZoom:1.02,id:"HO5yGRC1K",inspectionCursor:!1,items:[...]
const itemsRegex = /hoverZoom:1\.02,id:"HO5yGRC1K",inspectionCursor:!1,items:\[.*?\](?=,layout:)/s;
if (itemsRegex.test(sharedLibContent)) {
  const itemsJson = JSON.stringify(finalTiles);
  const replacement = `hoverZoom:1.02,id:"HO5yGRC1K",inspectionCursor:!1,items:${itemsJson}`;
  sharedLibContent = sharedLibContent.replace(itemsRegex, replacement);
  fs.writeFileSync(sharedLibPath, sharedLibContent, 'utf8');
  console.log('Successfully updated shared-lib.DWgExkQF.mjs with all tiles!');
} else {
  console.warn('Could not locate items array in shared-lib.DWgExkQF.mjs via regex');
}

console.log('--- Step 5: Updating dist/index.html with matching SSR pre-rendered tiles ---');
const indexPath = path.resolve('dist/index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Build HTML for each tile inside <ul class="v-grid">
const gridItemsHtml = finalTiles.map(tile => {
  const spanClass = `v-span-${tile.span}`;
  const mediaElement = tile.mediaType === 'video'
    ? `<video class="v-media" src="${tile.src}" autoplay loop muted playsinline preload="metadata"></video>`
    : `<img class="v-media" src="${tile.src}" alt="${tile.name}" loading="lazy" />`;
  
  return `        <li class="v-item ${spanClass}" data-framer-name="${tile.name}">
          <div class="v-media-wrap">
            ${mediaElement}
            <div class="v-overlay">
              <span class="v-item-category">${tile.category}</span>
              <h3 class="v-item-title">${tile.name}</h3>
            </div>
          </div>
        </li>`;
}).join('\n');

const gridRegex = /<ul class="v-grid">[\s\S]*?<\/ul>/;
if (gridRegex.test(indexHtml)) {
  indexHtml = indexHtml.replace(gridRegex, `<ul class="v-grid">\n${gridItemsHtml}\n      </ul>`);
  fs.writeFileSync(indexPath, indexHtml, 'utf8');
  console.log('Successfully updated dist/index.html with pre-rendered tiles!');
} else {
  console.warn('Could not locate <ul class="v-grid"> in dist/index.html');
}

console.log('=== All processing completed successfully! ===');
