const fs = require('fs');
const path = require('path');

// 1. Update shared-lib.DWgExkQF.mjs with Solar SMM content
const sharedLibPath = path.join(__dirname, 'dist', '_external', 'framerusercontent.com', 'sites', '2ej2QXIWjTLE3dtrtWou7u', 'shared-lib.DWgExkQF.mjs');
let sharedLibContent = fs.readFileSync(sharedLibPath, 'utf-8');

const solarItems = [
  {
    category: 'Balcony Solar',
    featured: false,
    file: '/_external/media/1.mp4',
    label: 'MG Solar Suncake Portable Balcony Solar Kit Demo',
    source: 'upload',
    span: 'tall',
    title: 'Suncake Balcony Kit',
    url: '',
    year: '2024'
  },
  {
    category: 'Commercial Solar',
    featured: false,
    file: '/_external/media/Final.mp4',
    label: 'Turnkey Solar Sourcing & Wholesale Supply',
    source: 'upload',
    span: 'normal',
    title: 'Commercial Turnkey Solar',
    url: '',
    year: '2024'
  },
  {
    category: 'Emergency Power',
    featured: false,
    file: '/_external/media/high.mp4',
    label: 'Bagyo Season Emergency Backup Power Prep',
    source: 'upload',
    span: 'normal',
    title: 'Bagyo Backup Solar',
    url: '',
    year: '2024'
  },
  {
    category: 'Roof Analysis',
    featured: true,
    file: '/_external/media/1.mp4',
    label: 'Interactive Roof Potential Calculator Demo',
    source: 'upload',
    span: 'large',
    title: 'Interactive Roof Calculator',
    url: '',
    year: '2024'
  },
  {
    category: 'Bill Savings',
    featured: false,
    file: '/_external/media/Final.mp4',
    label: 'Slashing 80% Off Daytime Electric Bills',
    source: 'upload',
    span: 'wide',
    title: 'Slash Bills by 80%',
    url: '',
    year: '2024'
  },
  {
    category: 'Wholesale B2B',
    featured: false,
    file: '/_external/media/high.mp4',
    label: 'Direct Sourcing and Wholesale Pricing',
    source: 'upload',
    span: 'wide',
    title: 'Direct Wholesale Sourcing',
    url: '',
    year: '2024'
  },
  {
    category: 'Condo & Apartment',
    featured: false,
    file: '/_external/media/1.mp4',
    label: 'Urban Living Balcony Power Without Roof Drill',
    source: 'upload',
    span: 'tall',
    title: 'Condo & Balcony Setup',
    url: '',
    year: '2024'
  },
  {
    category: 'Emergency Power',
    featured: false,
    file: '/_external/media/high.mp4',
    label: 'Brownout-Ready Typhoon Prep Kit',
    source: 'upload',
    span: 'normal',
    title: 'Typhoon Prep Checklist',
    url: '',
    year: '2024'
  },
  {
    category: 'Special Promo',
    featured: true,
    file: '/_external/media/Final.mp4',
    label: 'Special Promo 45K-55K Suncake Complete Kit',
    source: 'upload',
    span: 'large',
    title: 'Suncake Special Promo ₱55K',
    url: '',
    year: '2024'
  }
];

const startIdx = sharedLibContent.indexOf('hoverZoom:1.02,id:`HO5yGRC1K`,inspectionCursor:!1,items:[');
if (startIdx !== -1) {
  const itemsStart = startIdx + 'hoverZoom:1.02,id:`HO5yGRC1K`,inspectionCursor:!1,items:'.length;
  const itemsEnd = sharedLibContent.indexOf(']', itemsStart) + 1;
  const jsItems = JSON.stringify(solarItems).replace(/"([a-zA-Z0-9_]+)":/g, '$1:');
  sharedLibContent = sharedLibContent.substring(0, itemsStart) + jsItems + sharedLibContent.substring(itemsEnd);
  fs.writeFileSync(sharedLibPath, sharedLibContent, 'utf-8');
  console.log('Updated shared-lib items successfully.');
} else {
  console.error('Could not locate items array in shared-lib.');
}

// 2. Update dist/index.html titles and SSR HTML elements
const indexPath = path.join(__dirname, 'dist', 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf-8');

// Update document title and og titles
indexHtml = indexHtml.replace(/<title>.*?<\/title>/gi, '<title>MG Solar — Solar Video Gallery & SMM Showcase</title>');
indexHtml = indexHtml.replace(/<meta property="og:title" content=".*?">/gi, '<meta property="og:title" content="MG Solar — SMM Showcase">');
indexHtml = indexHtml.replace(/<meta name="twitter:title" content=".*?">/gi, '<meta name="twitter:title" content="MG Solar — SMM Showcase">');

// Replace static SSR video elements in index.html to match the solar items
const itemsHtml = solarItems.map((item, idx) => {
  const numStr = String(idx + 1).padStart(2, '0');
  const span = item.span || 'normal';
  return `<li data-key="${idx}-${item.file}" class="v-item" data-span="${span}"><button class="v-hit" data-clickable="true" data-cursor="false" type="button" aria-label="Play ${item.title} in focus view"><div class="v-frame"><span class="v-index">${numStr}</span><video class="v-media" src="${item.file}" aria-hidden="true" muted="" loop="" playsinline="" preload="metadata" disablepictureinpicture="" tabindex="-1" data-playing="false"></video><div class="v-cap v-cap-overlay"><p class="v-title">${item.title}</p><p class="v-meta">${item.category} · ${item.year}</p></div></div></button></li>`;
}).join('');

indexHtml = indexHtml.replace(/<ul class="v-grid">.*?<\/ul>/s, `<ul class="v-grid">${itemsHtml}</ul>`);
fs.writeFileSync(indexPath, indexHtml, 'utf-8');
console.log('Updated dist/index.html SSR grid successfully.');
