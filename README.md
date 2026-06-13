# 📋 DOKUMENTASI APLIKASI DUKOPS

**Last Updated:** 9 Juni 2026  
**Version:** 2.0 (Post-Cleanup)

---
## 📌 Ringkasan Aplikasi

**DUKOPS** adalah aplikasi web statis untuk pelaporan aktivitas militer (Babinsa) dengan fitur:
- 📍 Pemilihan lokasi desa dan koordinat GPS
- 📸 Upload gambar dengan watermark otomatis
- 🗓️ Pencatatan tanggal/waktu aktivitas
- 💾 Buat laporan ZIP dan upload ke Telegram/Google Drive
- 📅 Jadwal piket dan rotasi jaga kediaman

---

## 🏗️ Struktur Folder & File

```
dukops4-main/
├── index.html              # UI utama (semua fitur inline)
├── app.js                  # Logika utama aplikasi
├── styles.css              # Styling dan layout
├── server.js               # Node server untuk development
├── build.js                # Build script (copy ke dist/)
├── package.json            # Dependensi Node.js
│
├── data/
│   ├── hanpangan.txt       # Daftar jaga kediaman
│   ├── piket.txt           # Daftar jadwal piket
│   └── coordinates/        # Koordinat GPS per desa
│       ├── Gitgit.json
│       ├── Panji.json
│       ├── Sukasada.json
│       └── ... (13 desa lainnya)
│
├── assets/
│   ├── audio/
│   │   ├── audio-base64.js    # Generator audio base64
│   │   └── audio-pro-system.js # Web Audio API system
│   └── ... (file lainnya)
│
├── js/
│   └── utils/
│       └── common.js        # Utility bersama & backend helper
│
├── css/
├── Profile/
├── template-narasi.json     # Template narasi laporan
└── site.json / site.webmanifest
```

**Catatan Cleanup 9 Juni 2026:**
- ✅ Dihapus: `js/modules/dukops.js` dan `js/modules/piket.js` (sudah di-inline di index.html)
- ✅ Dihapus: Folder kosong `js/modules/` dan `js/components/`
- ✅ Dihapus: Folder `support/`, `.vscode/`, `.wrangler/` sebelumnya

---

## 🔧 Sistem Kerja Aplikasi

### 1. **Frontend (index.html + app.js)**
- Semua fitur UI ada di `index.html` (inline JavaScript)
- `app.js` berisi logika utama: toggle antara DUKOPS dan Jadwal Piket
- Menggunakan `localStorage` untuk menyimpan state pengguna

### 2. **Backend Cloud (Google Apps Script)**
- **URL Webhook:** `https://script.google.com/macros/s/AKfycbz3sB1d0PRRzlvAJwdr8nl5dQa6qpyfHQCJbYxBMz0Jpj2o-i1_WnwMzJEy3Z4GA9uh/exec`
- **Fungsi:**
  - Upload file ZIP ke Google Drive
  - Kirim file ZIP ke Telegram Group
  - Retrieve jadwal piket dari backend
  - Retrieve daftar hanpangan
  - Logging dan monitoring

### 3. **Data Lokal (data/)**

#### **a. Koordinat GPS (`data/coordinates/`)**
```json
// Contoh: Sukasada.json
{
  "coordinates": [
    {"lat": "-8.5242", "lon": "115.4589", "elevation": 450},
    {"lat": "-8.5245", "lon": "115.4591", "elevation": 451},
    ...
  ]
}
```
- Menyimpan multiple GPS points per desa
- Aplikasi pilih 1 koordinat **random** saat generate laporan
- Format: `lat,lon,elevation`

#### **b. Jadwal (`data/piket.txt` dan `data/hanpangan.txt`)**
- List nama untuk jadwal piket harian
- Load dari backend (Google Apps Script) jika tersedia
- Fallback ke file lokal jika backend gagal
- Diupdate oleh tim admin

### 4. **Workflow DUKOPS Babinsa**
```
1. User pilih Desa
   ↓
2. Load koordinat random dari data/coordinates/<Desa>.json
   ↓
3. User upload gambar aktivitas
   ↓
4. Canvas render watermark: desa + koordinat + tanggal
   ↓
5. User submit → generate ZIP
   ↓
6. ZIP berisi:
   - Gambar watermarked
   - JSON metadata
   - HTML laporan
   ↓
7. Kirim ke:
   - Telegram Group (via backend)
   - Google Drive (via backend)
   - Download lokal (browser)
```

### 5. **Workflow Jadwal Piket**
```
1. Load roster nama dari backend Google Apps Script
   ↓
2. Fallback ke data/piket.txt jika backend gagal
   ↓
3. User assign nama ke 12 dropdown (dinas dalam, kediaman, makodim)
   ↓
4. Generate formatted message
   ↓
5. Kirim ke Telegram Group atau WhatsApp
   ↓
6. Simpan pilihan ke localStorage untuk session berikutnya
```

---

## 🔌 Konfigurasi Backend

### Google Apps Script Webhook
```javascript
// Lokasi: app.js & js/utils/common.js
const GOOGLE_APPS_SCRIPT_WEBHOOK = "https://script.google.com/macros/s/AKfycbz3sB1d0PRRzlvAJwdr8nl5dQa6qpyfHQCJbYxBMz0Jpj2o-i1_WnwMzJEy3Z4GA9uh/exec";
```

### Fungsi Backend yang Dipakai
1. `sendToBackend('uploadDrive', data)` — Upload ZIP ke Drive
2. `sendToBackend('sendTelegram', data)` — Kirim ZIP ke Telegram
3. `sendToBackend('sendTelegramText', data)` — Kirim text ke Telegram
4. `sendToBackend('getJadwalData', {type: 'piket'})` — Ambil jadwal dari backend

### GitHub URLs (Fallback)
```javascript
const GITHUB_URLS = {
    HANPANGAN: "data/hanpangan.txt",
    PIKET: "data/piket.txt"
};
```

---

## 🚀 Setup & Jalankan Aplikasi

### Requirement
- Node.js ≥ 14
- Browser modern (Chrome, Firefox, Safari, Edge)

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Jalankan development server
npm start
# Akses: http://localhost:8080

# 3. Build untuk production
npm run build
# Output: dist/ folder (siap deploy)
```

### Production (Serve dist/)
```bash
npm run build
NODE_ENV=production node server.js dist
```

### Deploy ke Cloudflare Pages atau GitHub Pages
1. Push ke GitHub
2. Connect repo ke Cloudflare Pages
3. Build command: `npm run build`
4. Publish directory: `dist/`

---

## ⚠️ Troubleshooting & Reset

### ❌ Problem: Aplikasi tidak load koordinat

**Penyebab:**
- File `data/coordinates/<Desa>.json` tidak ada atau format salah

**Solusi:**
```json
// Pastikan format file benar:
{
  "coordinates": [
    {"lat": "value", "lon": "value", "elevation": "value"},
    ...
  ]
}
```

---

### ❌ Problem: Tidak bisa kirim ke Telegram

**Penyebab:**
- Backend Google Apps Script error
- Koneksi internet putus
- Token Telegram expired

**Solusi:**
1. Cek console browser (F12 → Console)
2. Cek status backend Google Apps Script
3. File masih bisa di-download lokal walaupun Telegram gagal

---

### ❌ Problem: Jadwal Piket tidak muncul

**Penyebab:**
- `data/piket.txt` kosong atau hilang
- Backend Google Apps Script error

**Solusi:**
1. Pastikan file ada: `data/piket.txt`
2. Format: 1 nama per baris
3. Cek fallback di console

---

### 🔄 RESET APLIKASI (Jika Semua Error)

Jika terjadi kesalahan serius, ikuti langkah ini untuk reset ke state bersih:

#### **1. Struktur Folder Harus Ada:**
```
dukops4-main/
├── index.html
├── app.js
├── styles.css
├── server.js
├── build.js
├── package.json
├── data/
│   ├── hanpangan.txt
│   ├── piket.txt
│   └── coordinates/ (dengan 15 file .json desa)
├── assets/
│   └── audio/ (audio-base64.js, audio-pro-system.js)
├── js/
│   └── utils/
│       └── common.js
├── css/
├── Profile/
└── template-narasi.json
```

#### **2. Reset dari Git (Jika ada versi terakhir)**
```bash
git reset --hard HEAD
git clean -fd
npm install
npm start
```

#### **3. Manual Reset Checklist:**
- [ ] `data/coordinates/` ada 15 file JSON (Gitgit, Panji, Panji Anom, Sukasada, Pancasari, Wanagiri, Ambengan, Kayu Putih, Padang Bulia, Pegadungan, Pegayaman, Sambangan, Selat, Silangjana, Tegallinggah)
- [ ] Setiap JSON punya struktur: `{ "coordinates": [...] }`
- [ ] `app.js` berisi fungsi utama: `loadDukopsApp()`, `sendToBackend()`, `loadDukopsApp()`
- [ ] `index.html` berisi semua UI (inline JavaScript)
- [ ] `js/utils/common.js` ada dengan fungsi helper backend
- [ ] `server.js` untuk development server
- [ ] `build.js` untuk create dist/

#### **4. Verifikasi Koneksi Backend**
```javascript
// Buka Browser Console (F12), jalankan:
sendToBackend('test').then(r => console.log(r));
// Jika sukses, akan melihat response dari Google Apps Script
```

---

## 📊 Struktur Data Penting

### **Koordinat Format**
```json
{
  "coordinates": [
    {"lat": "-8.5242", "lon": "115.4589", "elevation": "450"},
    {"lat": "-8.5245", "lon": "115.4591", "elevation": "451"}
  ]
}
```

### **localStorage Keys**
- `jadwalSelections` — Simpan pilihan dropdown jadwal piket
- `attendanceData` — Cache attendance report
- Lainnya: session state

### **ZIP File Content**
```
report_<Desa>_<Date>.zip
├── gambar_watermarked.png
├── data.json (metadata)
├── laporan.html
└── manifest.txt
```

---

## 🔐 Security Notes

⚠️ **PENTING:**
- Google Apps Script webhook URL **bersifat publik** (siapa saja bisa kirim request)
- Jangan expose token sensitif di frontend
- Semua token disimpan di backend Google Apps Script, bukan di repo

---

## 📝 File Penting untuk Reference

| File | Fungsi |
|------|--------|
| `index.html` | UI & logika aplikasi (inline) |
| `app.js` | Logic switching DUKOPS/Jadwal, init app |
| `js/utils/common.js` | Backend request helper, utility |
| `data/coordinates/*.json` | Data GPS per desa |
| `template-narasi.json` | Template teks laporan |
| `package.json` | Dependencies & scripts |

---

## 🎯 Catatan untuk Maintenance

1. **Tambah Desa Baru:**
   - Buat file `data/coordinates/<NamaDesa>.json` dengan format yang benar
   - Update dropdown di `index.html` jika perlu

2. **Update Jadwal Piket:**
   - Edit `data/piket.txt` atau update via backend Google Apps Script
   - Format: 1 nama per baris, tanpa spasi berlebih

3. **Ubah Backend:**
   - Ganti URL di `app.js` & `js/utils/common.js` baris 2
   - Pastikan backend baru punya endpoint yang sama

4. **Deploy:**
   - Run `npm run build`
   - Push `dist/` ke GitHub atau Cloudflare Pages

---

## 📞 Support

Jika ada error:
1. Buka Browser Console (F12)
2. Cek error message di console
3. Lihat network tab untuk request yang gagal
4. Cek struktur folder dan file sesuai checklist di atas

---

**Last Verified:** 9 Juni 2026  
**Repository Status:** Clean & Lean (Post-Cleanup)
