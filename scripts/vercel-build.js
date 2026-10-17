const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const vercelOutputDir = path.join(projectRoot, '.vercel', 'output');
const staticDir = path.join(vercelOutputDir, 'static');

console.log('Building for Vercel Static Edge Deployment...');

// Remove any leftover functions directory
const funcDir = path.join(vercelOutputDir, 'functions');
if (fs.existsSync(funcDir)) {
  fs.rmSync(funcDir, { recursive: true, force: true });
}

// Ensure staticDir exists
if (fs.existsSync(staticDir)) {
  fs.rmSync(staticDir, { recursive: true, force: true });
}
fs.mkdirSync(staticDir, { recursive: true });

// Copy dist into .vercel/output/static
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log(`Copying ${distDir} to ${staticDir}...`);
copyDirSync(distDir, staticDir);

// Write .vercel/output/config.json
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
      src: "^/(.*)\\.html/?$",
      headers: {
        "Location": "/$1"
      },
      status: 308
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

fs.writeFileSync(path.join(vercelOutputDir, 'config.json'), JSON.stringify(config, null, 2), 'utf8');
console.log('Vercel static build output ready in .vercel/output/static!');
