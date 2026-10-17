const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

const allFiles = walk('Resources');
const mediaFiles = allFiles.filter(f => {
  const ext = path.extname(f).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.mp4'].includes(ext);
});

console.log(`Found ${mediaFiles.length} media files.`);

const hashes = new Map();
const duplicates = [];
const uniqueMedia = [];

for (const file of mediaFiles) {
  const buf = fs.readFileSync(file);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  if (hashes.has(hash)) {
    duplicates.push({ file, duplicateOf: hashes.get(hash) });
  } else {
    hashes.set(hash, file);
    uniqueMedia.push({ file, hash, size: buf.length });
  }
}

console.log(`Unique media files: ${uniqueMedia.length}`);
console.log(`Duplicate files: ${duplicates.length}`);
if (duplicates.length > 0) {
  console.log('Sample duplicates:', duplicates.slice(0, 5));
}

// Let's get probe info for each file
console.log('Inspecting dimensions with ffprobe...');
const probed = [];
for (const item of uniqueMedia) {
  const ext = path.extname(item.file).toLowerCase();
  try {
    const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${item.file}"`;
    const res = execSync(cmd).toString().trim();
    const [w, h] = res.split('x').map(Number);
    probed.push({ ...item, width: w, height: h, ext, isVideo: ext === '.mp4' });
  } catch (err) {
    console.error(`Error probing ${item.file}:`, err.message);
  }
}

fs.writeFileSync('scripts/probed_media.json', JSON.stringify(probed, null, 2));
console.log('Saved probed info to scripts/probed_media.json');

// Breakdown by aspect ratio
let tall = 0, wide = 0, square = 0;
probed.forEach(p => {
  const ratio = p.width / p.height;
  if (ratio < 0.8) tall++;
  else if (ratio > 1.25) wide++;
  else square++;
});
console.log(`Aspect ratio breakdown: Tall (<0.8): ${tall}, Wide (>1.25): ${wide}, Square/Balanced (0.8-1.25): ${square}`);
