const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'dist', '_external', 'media');
fs.mkdirSync(targetDir, { recursive: true });

console.log('--- Step 1: Transcoding unique videos to WebM (VP9, ~800k, 720p) ---');
const videoConversions = [
  { src: 'Resources/1.mp4', dest: 'dist/_external/media/suncake_balcony_demo.webm' },
  { src: 'Resources/Final.mp4', dest: 'dist/_external/media/turnkey_solar_commercial.webm' },
  { src: 'Resources/high.mp4', dest: 'dist/_external/media/bagyo_emergency_backup.webm' }
];

for (const v of videoConversions) {
  console.log(`Transcoding ${v.src} -> ${v.dest}...`);
  execSync(`ffmpeg -i "${v.src}" -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -vf "scale=720:1280" -b:v 800k -an "${v.dest}" -y`, { stdio: 'inherit' });
}

console.log('\n--- Step 2: Transcoding unique image creatives to WebP ---');
const imageConversions = [
  { src: 'Resources/07 roof calculator.png', dest: 'dist/_external/media/roof_calculator.webp' },
  { src: 'Resources/08 3appliances.png', dest: 'dist/_external/media/3appliances.webp' },
  { src: 'Resources/14 bagyo season.png', dest: 'dist/_external/media/bagyo_prep_checklist.webp' },
  { src: 'Resources/suncake 55k promo copy.png', dest: 'dist/_external/media/suncake_55k_promo.webp' },
  { src: 'Resources/another day solar for posting copy.png', dest: 'dist/_external/media/another_day_solar.webp' },
  { src: 'Resources/slashing bill 80percent copy.png', dest: 'dist/_external/media/slashing_bill_80percent.webp' },
  { src: 'Resources/stop paying copy.png', dest: 'dist/_external/media/stop_paying_electric.webp' },
  { src: 'Resources/solar.png', dest: 'dist/_external/media/solar_system_overview.webp' },
  { src: 'Resources/posting/Solar_rooftop_aerial_infographic_2K_20260925162334.png', dest: 'dist/_external/media/aerial_rooftop_infographic.webp' },
  { src: 'Resources/posting/Solar_panel_and_lightbulb_design_2K_20260928135558.png', dest: 'dist/_external/media/solar_lightbulb_design.webp' },
  { src: 'Resources/PNG/Campaign_3_BOFU_Hot_Conversion/AdSet_3.2_Special_Promo_45K_Ribbon_and_Product_Close/suncake 45k promo copy.png', dest: 'dist/_external/media/suncake_45k_ribbon.webp' },
  { src: 'Resources/carouel/1.jpg', dest: 'dist/_external/media/carousel_slide_1.webp' }
];

for (const img of imageConversions) {
  console.log(`Converting ${img.src} -> ${img.dest}...`);
  execSync(`ffmpeg -i "${img.src}" -vf "scale=1080:-1" -c:v libwebp -q:v 75 "${img.dest}" -y`, { stdio: 'inherit' });
}

console.log('\n--- Step 3: Verifying file sizes and compression ratios ---');
let totalOriginal = 0;
let totalCompressed = 0;

for (const v of videoConversions) {
  const origSize = fs.statSync(v.src).size;
  const newSize = fs.statSync(v.dest).size;
  totalOriginal += origSize;
  totalCompressed += newSize;
  console.log(`${path.basename(v.dest)}: ${(origSize/1024/1024).toFixed(1)}MB -> ${(newSize/1024/1024).toFixed(2)}MB (${Math.round((1 - newSize/origSize)*100)}% reduction)`);
}

for (const img of imageConversions) {
  const origSize = fs.statSync(img.src).size;
  const newSize = fs.statSync(img.dest).size;
  totalOriginal += origSize;
  totalCompressed += newSize;
  console.log(`${path.basename(img.dest)}: ${(origSize/1024/1024).toFixed(2)}MB -> ${(newSize/1024).toFixed(1)}KB (${Math.round((1 - newSize/origSize)*100)}% reduction)`);
}

console.log(`\nTOTAL COMPRESSION: ${(totalOriginal/1024/1024).toFixed(1)}MB -> ${(totalCompressed/1024/1024).toFixed(2)}MB (${Math.round((1 - totalCompressed/totalOriginal)*100)}% reduction)!`);
