# DUKOPS BABINSA

Aplikasi web PWA untuk sistem pelaporan Babinsa Koramil Sukasada dengan dukungan offline, manifest, service worker, dan icon root.

## Siapa yang pakai
- Aplikasi ini dibuat untuk Babinsa / Koramil Sukasada.
- Nama aplikasi: **DUKOPS BABINSA**.
- Tujuan: presentasi data, absensi, jadwal piket, dan fungsi WhatsApp dengan dukungan PWA.

## Status PWA
- `site.webmanifest` sudah valid dan siap pakai.
- `sw.js` sudah terdaftar di root dan menggunakan cache asset root paths.
- `index.html` sudah memuat manifest dan mendaftarkan service worker dengan benar.
- Semua icon manifest kini berada di folder `icons/`:
  - `icons/favicon-96x96.png`
  - `icons/web-app-manifest-192x192.png`
  - `icons/web-app-manifest-512x512.png`
  - `icons/favicon.svg`

## Siap untuk WebPWABuilder APK
Aplikasi ini sudah siap diupload ke `webpwabuilder.com` dengan URL HTTPS root:
- `https://domainkamu.com/`

### Langkah cepat
1. Deploy folder `dukops4-main` ke hosting HTTPS.
2. Pastikan URL root mengarah ke `index.html`.
3. Pastikan file-file berikut dapat diakses langsung:
   - `/index.html`
   - `/site.webmanifest`
   - `/sw.js`
   - `/icons/favicon-96x96.png`
   - `/icons/web-app-manifest-192x192.png`
   - `/icons/web-app-manifest-512x512.png`
4. Buka `webpwabuilder.com` dan masukkan URL root aplikasi.
5. WebPWABuilder akan memvalidasi PWA dan menghasilkan APK.

## Bagian penting yang sudah dikonfigurasi
- `site.webmanifest`:
  - `start_url`: `/`
  - `scope`: `/`
  - `display`: `standalone`
  - `theme_color`, `background_color`, `shortcuts`, `categories`
- `sw.js`:
  - `navigator.serviceWorker.register('sw.js')`
  - cache asset root paths
  - offline fallback mengarah ke `/`
- `index.html`:
  - `rel="manifest" href="site.webmanifest"`
  - `rel="icon"` dan `apple-touch-icon`

## Run lokal (opsional)
Jika ingin mengecek aplikasi di lokal sebelum deploy:
```bash
npm install
npm start
```

Kemudian buka `http://localhost:3000` atau port yang digunakan `server.js`.

## Siapkan URL publik
WebPWABuilder memerlukan URL publik HTTPS. Jika belum punya hosting, gunakan layanan gratis seperti:
- Netlify
- Vercel
- Cloudflare Pages
- GitHub Pages + custom domain

### Deploy ke Cloudflare Pages
1. Push repository ini ke GitHub.
2. Buka Cloudflare Pages dan buat proyek baru.
3. Pilih repo GitHub yang berisi `dukops4-main`.
4. Atur build command: `npm run build`.
5. Atur output directory: `dist`.
6. Deploy dan buka domain Pages.

> Workflow sudah disiapkan di `.github/workflows/cloudflare-pages-deploy.yml`.

### GitHub Secrets untuk deploy otomatis
- `CLOUDFLARE_API_TOKEN`
- `CF_ACCOUNT_ID`
- `CF_PAGES_PROJECT_NAME`

## File final yang diperlukan
- `index.html`
- `site.webmanifest`
- `sw.js`
- `icons/favicon-96x96.png`
- `icons/web-app-manifest-192x192.png`
- `icons/web-app-manifest-512x512.png`
- `icons/favicon.svg`

## Folder platform native icon
- `android/`:
  - berisi launcher icon untuk build Android.
  - ukuran: `48x48`, `72x72`, `96x96`, `144x144`, `192x192`, `512x512`.
- `ios/`:
  - berisi icon iOS untuk App Store dan home screen.
  - ukuran mulai dari `16x16` sampai `1024x1024`.
- `windows/`:
  - berisi asset Windows tile dan logo untuk paket Windows.
  - ukuran dan variasi skala disesuaikan dengan kebutuhan tile dan Universal Windows Platform.

## Hasil akhir
Aplikasi ini sudah siap pakai untuk pembuatan APK melalui WebPWABuilder.
Jika kamu perlu, saya bisa juga siapkan `deploy` singkat ke hosting statis seperti Netlify atau Vercel.
