// Simple build script: copy selected files/folders into `dist/`
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dist = path.join(root, 'dist');

const pathsToCopy = [
  'index.html', 'app.js', 'styles.css', 'site.json', 'site.webmanifest', 'README.md',
  'css', 'js', 'assets', 'data', 'Profile', 'support'
];

function rimraf(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.lstatSync(p);
    if (stat.isDirectory()) {
      rimraf(p);
    } else {
      fs.unlinkSync(p);
    }
  }
  fs.rmdirSync(dir);
}

function copy(src, dest) {
  const stat = fs.lstatSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copy(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function build() {
  if (fs.existsSync(dist)) rimraf(dist);
  fs.mkdirSync(dist, { recursive: true });

  for (const p of pathsToCopy) {
    const abs = path.join(root, p);
    if (!fs.existsSync(abs)) continue;
    const dest = path.join(dist, p);
    try {
      copy(abs, dest);
      console.log('Copied', p);
    } catch (e) {
      console.warn('Skipping', p, '(', e.message, ')');
    }
  }

  console.log('\nBuild complete: dist/ ready');
}

if (process.argv.includes('--clean')) {
  rimraf(dist);
  console.log('dist/ removed');
  process.exit(0);
}

build();
