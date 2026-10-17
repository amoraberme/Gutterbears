const fs = require('fs');
const path = require('path');

const resourcesDir = path.resolve('Resources');
const captionFiles = [];

function findCaptions(dir) {
  const list = fs.readdirSync(dir);
  for (const f of list) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      findCaptions(full);
    } else if (f.toLowerCase().endsWith('.md')) {
      captionFiles.push(full);
    }
  }
}

findCaptions(resourcesDir);
console.log(`Found ${captionFiles.length} markdown caption/doc files.`);

const creativeMap = new Map();

for (const capFile of captionFiles) {
  const content = fs.readFileSync(capFile, 'utf8');
  // Look for sections like ### 1. `filename.png` or ### `filename.png`
  const lines = content.split('\n');
  let currentFile = null;
  let currentAngle = '';
  let currentHeadline = '';
  let currentDesc = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fileMatch = line.match(/###\s*(?:\d+\.\s*)?`([^`]+\.(?:png|jpg|mp4))`(?:\s*\(([^)]+)\))?/i);
    if (fileMatch) {
      if (currentFile) {
        creativeMap.set(currentFile.toLowerCase(), { angle: currentAngle, headline: currentHeadline, desc: currentDesc });
      }
      currentFile = fileMatch[1].trim();
      currentAngle = '';
      currentHeadline = '';
      currentDesc = '';
    } else {
      const angleMatch = line.match(/\*\s*\*\*Angle:\*\*\s*(.+)/i);
      if (angleMatch) currentAngle = angleMatch[1].trim();
      
      const headMatch = line.match(/\*\s*\*\*Headline:\*\*\s*(.+)/i);
      if (headMatch) currentHeadline = headMatch[1].trim();

      const descMatch = line.match(/\*\s*\*\*Description:\*\*\s*(.+)/i);
      if (descMatch) currentDesc = descMatch[1].trim();
    }
  }
  if (currentFile) {
    creativeMap.set(currentFile.toLowerCase(), { angle: currentAngle, headline: currentHeadline, desc: currentDesc });
  }
}

console.log(`Extracted metadata for ${creativeMap.size} creatives from markdown files.`);
let sample = 0;
for (const [k, v] of creativeMap.entries()) {
  if (sample++ < 5) console.log(k, '=>', v);
}
