const fs = require('fs');
const path = require('path');

// Target items with 0 duplicate assets, arranged dynamically with scale-aware spans:
// normal (span 1x3), wide (span 2x3), tall (span 1x4), large (span 2x4)
const diverseScaleItems = [
  {
    category: 'Balcony Solar',
    featured: false,
    file: '/_external/media/suncake_balcony_demo.webm',
    label: 'MG Solar Suncake Portable Balcony Solar Kit Demo Video',
    source: 'upload',
    span: 'tall', // 9:16 portrait video
    title: 'Suncake Balcony Video',
    url: '',
    year: '2024'
  },
  {
    category: 'Roof Analysis',
    featured: false,
    file: '/_external/media/roof_calculator.webp',
    label: 'Interactive Roof Potential & Monthly Bill Calculator',
    source: 'upload',
    span: 'normal', // 1:1 square
    title: 'Interactive Roof Calculator',
    url: '',
    year: '2024'
  },
  {
    category: 'Typhoon Prep',
    featured: false,
    file: '/_external/media/bagyo_prep_checklist.webp',
    label: 'Bagyo Season Emergency Checklist & Portable Solar',
    source: 'upload',
    span: 'normal', // 1:1 square
    title: 'Typhoon Prep Checklist',
    url: '',
    year: '2024'
  },
  {
    category: 'Commercial Solar',
    featured: true,
    file: '/_external/media/turnkey_solar_commercial.webm',
    label: 'Direct Turnkey Solar Sourcing & Wholesale Supply Video',
    source: 'upload',
    span: 'large', // hero feature
    title: 'Commercial Turnkey Solar',
    url: '',
    year: '2024'
  },
  {
    category: 'Direct Sourcing',
    featured: false,
    file: '/_external/media/another_day_solar.webp',
    label: 'Another Day Solar - Direct Wholesale Pricing',
    source: 'upload',
    span: 'wide', // 2:3 horizontal/wide coverage
    title: 'Direct Wholesale Sourcing',
    url: '',
    year: '2024'
  },
  {
    category: 'Home Appliances',
    featured: false,
    file: '/_external/media/3appliances.webp',
    label: 'Run 3 Major Appliances Daytime with Zero Electric Bill',
    source: 'upload',
    span: 'normal',
    title: '3 Heavy Appliances Covered',
    url: '',
    year: '2024'
  },
  {
    category: 'Emergency Power',
    featured: false,
    file: '/_external/media/bagyo_emergency_backup.webm',
    label: 'Emergency Backup Solar Power Station Demo Video',
    source: 'upload',
    span: 'tall', // 9:16 portrait video
    title: 'Emergency Backup Power',
    url: '',
    year: '2024'
  },
  {
    category: 'Bill Savings',
    featured: false,
    file: '/_external/media/slashing_bill_80percent.webp',
    label: 'Slash 80% Off Daytime Meralco Power Bills',
    source: 'upload',
    span: 'normal',
    title: 'Slash Bills by 80%',
    url: '',
    year: '2024'
  },
  {
    category: 'Special Promo',
    featured: true,
    file: '/_external/media/suncake_55k_promo.webp',
    label: 'Special Promo ₱55,000 Suncake Complete Balcony Kit',
    source: 'upload',
    span: 'large', // hero feature
    title: 'Suncake Special Promo ₱55K',
    url: '',
    year: '2024'
  },
  {
    category: 'Rooftop Aerial',
    featured: false,
    file: '/_external/media/aerial_rooftop_infographic.webp',
    label: 'Complete Rooftop Aerial Layout & Solar Placement',
    source: 'upload',
    span: 'wide',
    title: 'Rooftop Aerial Analysis',
    url: '',
    year: '2024'
  },
  {
    category: 'Zero Electric Bills',
    featured: false,
    file: '/_external/media/stop_paying_electric.webp',
    label: 'Stop Paying Expensive Daytime Electric Rates',
    source: 'upload',
    span: 'normal',
    title: 'Stop Paying Daytime Rates',
    url: '',
    year: '2024'
  },
  {
    category: 'Suncake 45K Ribbon',
    featured: false,
    file: '/_external/media/suncake_45k_ribbon.webp',
    label: 'Limited Batch ₱45,000 Promotional Ribbon Edition',
    source: 'upload',
    span: 'tall',
    title: '₱45K Promo Ribbon Edition',
    url: '',
    year: '2024'
  }
];

// 1. Update shared-lib.DWgExkQF.mjs
const sharedLibPath = path.join(__dirname, 'dist', '_external', 'framerusercontent.com', 'sites', '2ej2QXIWjTLE3dtrtWou7u', 'shared-lib.DWgExkQF.mjs');
let sharedLibContent = fs.readFileSync(sharedLibPath, 'utf-8');

// Ensure image vs video polymorphic rendering in shared-lib:
// Replace bo(e) function to handle WebP images without video #t=0.1
sharedLibContent = sharedLibContent.replace(
  'function bo(e){return e.indexOf(`#`)===-1?`${e}#t=0.1`:e}',
  'function bo(e){return e.endsWith(".webp")||e.indexOf("#")!==-1?e:`${e}#t=0.1`}'
);

// Update Tile video render to render <img> if source ends with .webp, or <video> if .webm/.mp4
const videoTileSnippet = 'p(`video`,{ref:Se(e.key),className:`v-media`,src:e.src,"aria-hidden":`true`,muted:!0,loop:s.loopClips,playsInline:!0,preload:`metadata`,disablePictureInPicture:!0,tabIndex:-1,"data-playing":`false`})';
const polyTileSnippet = 'e.src.endsWith(".webp")?p(`img`,{className:`v-media`,src:e.src,alt:e.title||e.label,loading:`lazy`}):p(`video`,{ref:Se(e.key),className:`v-media`,src:e.src,"aria-hidden":`true`,muted:!0,loop:s.loopClips,playsInline:!0,preload:`metadata`,disablePictureInPicture:!0,tabIndex:-1,"data-playing":`false`})';

if (sharedLibContent.includes(videoTileSnippet)) {
  sharedLibContent = sharedLibContent.replace(videoTileSnippet, polyTileSnippet);
  console.log('Replaced tile video renderer with polymorphic <img>/<video> renderer.');
}

// Update Modal stage video render to handle .webp as <img> or .webm as <video>
const stageVideoSnippet = 'children:p(S.video,{ref:y,className:`v-stage-media`,src:x.src,"aria-label":x.label,controls:!0,loop:h,playsInline:!0,preload:`metadata`,initial:!f&&{opacity:0,scale:.99},animate:{opacity:1,scale:1},exit:f?void 0:{opacity:0},transition:{duration:ee}},x.src)';
const polyStageSnippet = 'children:x.src.endsWith(".webp")?p(`img`,{className:`v-stage-media`,src:x.src,alt:x.title||x.label,style:{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}):p(S.video,{ref:y,className:`v-stage-media`,src:x.src,"aria-label":x.label,controls:!0,loop:h,playsInline:!0,preload:`metadata`,initial:!f&&{opacity:0,scale:.99},animate:{opacity:1,scale:1},exit:f?void 0:{opacity:0},transition:{duration:ee}},x.src)';

if (sharedLibContent.includes(stageVideoSnippet)) {
  sharedLibContent = sharedLibContent.replace(stageVideoSnippet, polyStageSnippet);
  console.log('Replaced modal stage video renderer with polymorphic <img>/<video> renderer.');
}

// Update items array in sharedLib
const startIdx = sharedLibContent.indexOf('hoverZoom:1.02,id:`HO5yGRC1K`,inspectionCursor:!1,items:[');
if (startIdx !== -1) {
  const itemsStart = startIdx + 'hoverZoom:1.02,id:`HO5yGRC1K`,inspectionCursor:!1,items:'.length;
  const itemsEnd = sharedLibContent.indexOf(']', itemsStart) + 1;
  const jsItems = JSON.stringify(diverseScaleItems).replace(/"([a-zA-Z0-9_]+)":/g, '$1:');
  sharedLibContent = sharedLibContent.substring(0, itemsStart) + jsItems + sharedLibContent.substring(itemsEnd);
  fs.writeFileSync(sharedLibPath, sharedLibContent, 'utf-8');
  console.log('Updated shared-lib items array with 12 diverse zero-duplicate WebP/WebM items.');
}

// 2. Update dist/index.html SSR pre-render
const indexPath = path.join(__dirname, 'dist', 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf-8');

const itemsHtml = diverseScaleItems.map((item, idx) => {
  const numStr = String(idx + 1).padStart(2, '0');
  const span = item.span || 'normal';
  const isWebp = item.file.endsWith('.webp');
  const mediaTag = isWebp
    ? `<img class="v-media" src="${item.file}" alt="${item.title}" loading="lazy" style="object-fit:cover;width:100%;height:100%;">`
    : `<video class="v-media" src="${item.file}" aria-hidden="true" muted="" loop="" playsinline="" preload="metadata" disablepictureinpicture="" tabindex="-1" data-playing="false"></video>`;

  return `<li data-key="${idx}-${item.file}" class="v-item" data-span="${span}"><button class="v-hit" data-clickable="true" data-cursor="false" type="button" aria-label="Play ${item.title} in focus view"><div class="v-frame"><span class="v-index">${numStr}</span>${mediaTag}<div class="v-cap v-cap-overlay"><p class="v-title">${item.title}</p><p class="v-meta">${item.category} · ${item.year}</p></div></div></button></li>`;
}).join('');

indexHtml = indexHtml.replace(/<ul class="v-grid">.*?<\/ul>/s, `<ul class="v-grid">${itemsHtml}</ul>`);
fs.writeFileSync(indexPath, indexHtml, 'utf-8');
console.log('Updated dist/index.html SSR grid with 12 unique items successfully.');
