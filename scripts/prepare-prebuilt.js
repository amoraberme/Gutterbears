const fs = require('fs');
const path = require('path');

const outputDir = path.resolve('.vercel/output');
const staticDir = path.join(outputDir, 'static');
const funcDir = path.join(outputDir, 'functions');

// Remove functions completely so Vercel doesn't create any lambdas
if (fs.existsSync(funcDir)) {
  fs.rmSync(funcDir, { recursive: true, force: true });
  console.log('Removed .vercel/output/functions');
}

// Copy dist into static if needed
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir('dist', staticDir);
console.log('Synchronized dist -> .vercel/output/static');

// Write pure static config.json
const config = {
  version: 3,
  routes: [
    {
      src: "^/_external/(.*)",
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable"
      },
      continue: true
    },
    {
      handle: "filesystem"
    },
    {
      src: "/(.*)",
      dest: "/index.html"
    }
  ]
};
fs.writeFileSync(path.join(outputDir, 'config.json'), JSON.stringify(config, null, 2), 'utf8');

// Ensure builds.json specifies production target
const buildsJson = {
  target: 'production',
  builds: []
};
fs.writeFileSync(path.join(outputDir, 'builds.json'), JSON.stringify(buildsJson, null, 2), 'utf8');

console.log('Prebuilt static output prepared successfully for production!');
