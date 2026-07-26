// ============================================================
// build.js - Simple build script
// ============================================================
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dist = path.join(root, 'dist');

// ===== FILE & FOLDER YANG AKAN DISALIN =====
const pathsToCopy = [
  // File utama
  'index.html',
  'app.js',
  'sw.js',
  
  // CSS
  'css',
  
  // JavaScript
  'js',
  
  // Assets
  'assets',
  
  // Data
  'data',
  
  // Icons
  'icons',
  
  // Header background
  'header',
  
  // Profile images (huruf kecil)
  'profile',
  
  // Gambar pendukung
  'army.gif',
  'LOGO KOREM163 Wirasatya.png',
  
  // PWA
  'site.webmanifest',
  
  // Dokumentasi
  'README.md'
];

// ============================================================
// FUNGSI UTILITY
// ============================================================
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

// ============================================================
// FUNGSI BUILD
// ============================================================
function build() {
  console.log('🚀 Starting build...\n');

  // Hapus dist/ jika ada
  if (fs.existsSync(dist)) {
    console.log('🗑️  Cleaning dist/...');
    rimraf(dist);
  }

  // Buat folder dist/
  fs.mkdirSync(dist, { recursive: true });
  console.log('📁 Created dist/\n');

  // Copy semua file & folder
  let copiedCount = 0;
  let skippedCount = 0;

  for (const p of pathsToCopy) {
    const abs = path.join(root, p);
    if (!fs.existsSync(abs)) {
      console.log(`⚠️  Skipping ${p} (not found)`);
      skippedCount++;
      continue;
    }

    const dest = path.join(dist, p);
    try {
      copy(abs, dest);
      console.log(`✅ Copied ${p}`);
      copiedCount++;
    } catch (e) {
      console.log(`❌ Failed to copy ${p}: ${e.message}`);
      skippedCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Build Summary:`);
  console.log(`   ✅ Copied: ${copiedCount} items`);
  console.log(`   ⚠️  Skipped: ${skippedCount} items`);
  console.log(`   📁 Output: ${dist}`);
  console.log('='.repeat(50));
  console.log('\n✅ Build complete!');
}

// ============================================================
// CLEAN COMMAND
// ============================================================
if (process.argv.includes('--clean')) {
  if (fs.existsSync(dist)) {
    rimraf(dist);
    console.log('🗑️  dist/ removed');
  } else {
    console.log('ℹ️  dist/ does not exist');
  }
  process.exit(0);
}

// ============================================================
// RUN BUILD
// ============================================================
build();
