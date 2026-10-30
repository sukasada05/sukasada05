# DUKOPS BABINSA

Sistem pelaporan digital untuk Babinsa Koramil 05 Sukasada. Aplikasi ini digunakan untuk membuat laporan kegiatan, mengunggah foto, menandai koordinat wilayah, serta menghasilkan arsip ZIP yang dapat didownload dan dikirim ke Google Drive.

## Fitur utama

- Pilih desa/kelurahan dari daftar wilayah
- Tampilkan koordinat wilayah secara acak dari data JSON
- Input tanggal dan waktu kegiatan
- Unggah foto kegiatan dengan validasi orientasi landscape
- Isi narasi kegiatan secara otomatis dengan format yang konsisten
- Generate preview foto dengan watermark desa, koordinat, dan tanggal
- Ekspor laporan menjadi file ZIP berisi:
  - foto kegiatan (`.png`)
  - narasi (`.txt`)
- Upload laporan ke Google Drive
- Tampilkan log file laporan terkirim per desa
- Tampilan aplikasi versi PWA yang dapat diinstall
- Menu absensi dan dashboard laporan pendukung

## Struktur repo

- `index.html` — halaman utama aplikasi
- `app.js` — logika aplikasi, validasi, upload, dan integrasi laporan
- `css/` — stylesheet aplikasi
- `js/` — script tambahan JS
- `data/` — data wilayah dan koordinat desa/kelurahan
- `logo/`, `header/`, `icons/`, `cursor/` — aset UI
- `running-txt/` — teks berjalan yang tampil di splash screen
- `sw.js` — service worker untuk PWA
- `site.webmanifest` — manifest aplikasi

## Teknologi yang digunakan

- HTML5
- CSS3
- JavaScript
- JSZip
- Supabase JS
- html2canvas
- Font Awesome
- Google Apps Script / Google Drive integration

## Cara menjalankan

Karena ini adalah aplikasi web statis, cukup buka file `index.html` di browser.

Untuk server lokal, jalankan:

```bash
python -m http.server 8000
```

Lalu buka:

```text
http://localhost:8000/
```

## Catatan penting

- Aplikasi memerlukan file `data/desa-list.json` dan file koordinat wilayah di folder `data/coordinates/` agar fitur pemilihan desa dan koordinat dapat berjalan.
- Untuk fungsi upload ke Google Drive dan laporan absensi, aplikasi menggunakan endpoint Google Apps Script yang sudah dikonfigurasi dalam file JavaScript.
- Aplikasi ini dirancang untuk penggunaan internal/operasional Babinsa dan mungkin memerlukan penyesuaian konfigurasi sesuai lingkungan masing-masing.

## Lisensi

Repo ini dibuat untuk kebutuhan internal dan tidak dilengkapi lisensi publik yang eksplisit.

## Pengembang

- sukasada05

## Status

Proyek masih dalam pengembangan berkelanjutan untuk kebutuhan pelaporan digital wilayah Sukasada.
