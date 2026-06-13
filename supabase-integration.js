// ============================================
// SUPABASE INTEGRATION UNTUK DUKOPS
// VERSI LENGKAP - LANGSUNG JALAN
// ============================================

const SUPABASE_URL = 'https://qthoexsadattfnnzcawh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0aG9leHNhZGF0dGZubnpjYXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTMzNTAsImV4cCI6MjA5NjEyOTM1MH0.qZBFjrN8F8vwxoaPKIPLDQIOWbt58BNlPWLOn4J_5_4';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============ FUNGSI AMBIL DATA DARI FORM ============
function ambilDataLaporan() {
    const selectDesa = document.getElementById('selectDesa');
    const previewKoordinat = document.getElementById('previewKordinat');
    const tanggalWaktu = document.getElementById('tanggalWaktu');
    const narasi = document.getElementById('narasi');
    const gambar = document.getElementById('gambar');
    
    let namaDesa = '';
    if (selectDesa && selectDesa.selectedIndex >= 0) {
        namaDesa = selectDesa.options[selectDesa.selectedIndex]?.text || '';
    }
    
    let koordinat = '';
    if (previewKoordinat) {
        koordinat = previewKoordinat.textContent || '';
        koordinat = koordinat.replace('📍 ', '').replace('📌 ', '').trim();
    }
    
    let tanggalKegiatan = '';
    let waktuKegiatan = '';
    if (tanggalWaktu && tanggalWaktu.value) {
        const tgl = new Date(tanggalWaktu.value);
        tanggalKegiatan = tgl.toISOString().split('T')[0];
        waktuKegiatan = tgl.toTimeString().split(' ')[0];
    }
    
    let namaFile = '';
    if (namaDesa && tanggalKegiatan) {
        const date = new Date(tanggalWaktu.value);
        const day = String(date.getDate()).padStart(2, '0');
        const monthNum = String(date.getMonth() + 1);
        const year = date.getFullYear();
        namaFile = `${namaDesa} ${day} ${monthNum} ${year}.zip`;
    }
    
    let ukuranFile = '';
    if (gambar && gambar.files && gambar.files[0]) {
        const sizeKB = gambar.files[0].size / 1024;
        ukuranFile = sizeKB.toFixed(2) + ' KB';
    }
    
    return {
        nama_desa: namaDesa,
        koordinat: koordinat,
        tanggal_kegiatan: tanggalKegiatan,
        waktu_kegiatan: waktuKegiatan,
        narasi_kegiatan: narasi ? narasi.value : '',
        nama_babinsa: namaDesa,
        pangkat: 'Babinsa',
        nrp: '-',
        status_kirim: 'terkirim',
        nama_file_zip: namaFile,
        ukuran_file: ukuranFile,
        tanggal_kirim: new Date().toISOString()
    };
}

// ============ FUNGSI SIMPAN KE SUPABASE ============
async function simpanKeSupabase(data) {
    try {
        const { data: hasil, error } = await supabase
            .from('laporan_dukops')
            .insert([data]);
        
        if (error) throw error;
        return { success: true, data: hasil };
    } catch (error) {
        console.error('Gagal simpan:', error);
        return { success: false, error: error.message };
    }
}

// ============ TAMPILKAN NOTIFIKASI ============
function tampilkanNotifikasi(pesan, jenis = 'berhasil') {
    let notif = document.getElementById('notifSupabase');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notifSupabase';
        notif.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            border-radius: 30px;
            font-size: 13px;
            font-weight: bold;
            z-index: 10000;
            display: none;
            white-space: nowrap;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(notif);
    }
    
    if (jenis === 'berhasil') {
        notif.style.backgroundColor = '#2ecc71';
        notif.style.color = '#0a1a0a';
        notif.innerHTML = '✅ ' + pesan;
    } else {
        notif.style.backgroundColor = '#e74c3c';
        notif.style.color = 'white';
        notif.innerHTML = '❌ ' + pesan;
    }
    
    notif.style.display = 'block';
    setTimeout(() => {
        notif.style.display = 'none';
    }, 3000);
}

// ============ TOMBOL LIHAT LAPORAN ============
function tambahTombolLihatLaporan() {
    const actionButtons = document.querySelector('.action-buttons');
    if (!actionButtons) {
        setTimeout(tambahTombolLihatLaporan, 1000);
        return;
    }
    
    if (document.getElementById('btnLihatLaporanSupabase')) return;
    
    const btn = document.createElement('button');
    btn.id = 'btnLihatLaporanSupabase';
    btn.innerHTML = '<i class="fas fa-database"></i> 📋 LIHAT LAPORAN DI SUPABASE';
    btn.style.background = '#3498db';
    btn.style.marginTop = '10px';
    btn.onclick = async () => {
        const { data, error } = await supabase
            .from('laporan_dukops')
            .select('*')
            .order('tanggal_kirim', { ascending: false });
        
        if (error) {
            tampilkanNotifikasi('Gagal mengambil data', 'gagal');
            return;
        }
        
        if (!data || data.length === 0) {
            tampilkanNotifikasi('Belum ada laporan tersimpan', 'gagal');
            return;
        }
        
        // Buat modal
        let modal = document.getElementById('modalLaporan');
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = 'modalLaporan';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        let html = `
            <div style="background: #1a2a1f; border-radius: 16px; width: 95%; max-width: 850px; max-height: 85vh; display: flex; flex-direction: column; border: 1px solid #2ecc71;">
                <div style="padding: 15px 20px; background: #0d2a1d; border-bottom: 1px solid #2ecc71; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="color: #2ecc71; margin: 0;">
                        <i class="fas fa-database"></i> LAPORAN DUKOPS DI SUPABASE
                    </h3>
                    <button onclick="document.getElementById('modalLaporan').remove()" style="background: none; border: none; color: #ff6666; font-size: 24px; cursor: pointer; margin: 0;">✕</button>
                </div>
                <div style="padding: 15px; overflow-y: auto; flex: 1;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background: #2a4a2a;">
                                <th style="padding: 8px; text-align: left;">Desa</th>
                                <th style="padding: 8px; text-align: left;">Tanggal</th>
                                <th style="padding: 8px; text-align: left;">Koordinat</th>
                                <th style="padding: 8px; text-align: left;">Narasi</th>
                                <th style="padding: 8px; text-align: left;">Waktu Kirim</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        data.forEach(l => {
            html += `
                <tr style="border-bottom: 1px solid #2a4a2a;">
                    <td style="padding: 8px;">${l.nama_desa || '-'}</td>
                    <td style="padding: 8px;">${l.tanggal_kegiatan || '-'}</td>
                    <td style="padding: 8px; font-size: 10px;">${(l.koordinat || '-').substring(0, 25)}</td>
                    <td style="padding: 8px;">${(l.narasi_kegiatan || '-').substring(0, 40)}${(l.narasi_kegiatan || '').length > 40 ? '...' : ''}</td>
                    <td style="padding: 8px;">${l.tanggal_kirim ? new Date(l.tanggal_kirim).toLocaleString() : '-'}</td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                    <div style="margin-top: 15px; text-align: center; color: #888; font-size: 11px;">
                        Total: ${data.length} laporan tersimpan
                    </div>
                </div>
            </div>
        `;
        
        modal.innerHTML = html;
        document.body.appendChild(modal);
    };
    
    actionButtons.appendChild(btn);
}

// ============ HUBUNGKAN KE TOMBOL SUBMIT ============
function hubungkanTombolSubmit() {
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) {
        setTimeout(hubungkanTombolSubmit, 500);
        return;
    }
    
    const originalOnclick = submitBtn.onclick;
    
    submitBtn.onclick = async function(e) {
        const dataLaporan = ambilDataLaporan();
        
        if (!dataLaporan.nama_desa) {
            console.log('Desa belum dipilih, lewati simpan ke Supabase');
            if (typeof originalOnclick === 'function') {
                originalOnclick.call(submitBtn, e);
            }
            return;
        }
        
        const hasil = await simpanKeSupabase(dataLaporan);
        
        if (hasil.success) {
            tampilkanNotifikasi('✅ Laporan tersimpan di Supabase!', 'berhasil');
        } else {
            tampilkanNotifikasi('⚠️ Gagal simpan ke Supabase', 'gagal');
        }
        
        if (typeof originalOnclick === 'function') {
            originalOnclick.call(submitBtn, e);
        }
    };
    
    console.log('✅ Supabase integration aktif!');
}

// ============ START ============
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        hubungkanTombolSubmit();
        setTimeout(tambahTombolLihatLaporan, 1000);
    });
} else {
    hubungkanTombolSubmit();
    setTimeout(tambahTombolLihatLaporan, 1000);
}
// ==========================================
// LED RUNNING TEXT - OTOMATIS TAMBAH TANPA RUBAH HTML
// ==========================================

function buatLedRunningText() {
    // Cek apakah sudah ada, jika sudah jangan buat duplikat
    if (document.getElementById('ledRunningContainer')) return;
    
    // Teks yang akan ditampilkan
    const teks = "⚡ DUKOPS BABINSA SUKASADA ⚡";
    const warnaLed = [
        'led-red', 'led-orange', 'led-yellow', 'led-green', 
        'led-cyan', 'led-blue', 'led-magenta', 'led-white', 'led-gold'
    ];
    
    // Buat container LED
    const container = document.createElement('div');
    container.id = 'ledRunningContainer';
    container.className = 'led-running-container';
    
    // Buat border LED
    const border = document.createElement('div');
    border.className = 'led-border';
    container.appendChild(border);
    
    // Buat wrapper teks
    const textWrapper = document.createElement('div');
    textWrapper.className = 'led-running-text';
    
    // Fungsi untuk membuat huruf LED dengan warna acak
    function buatHurufLed(huruf) {
        if (huruf === ' ') {
            return '<span style="display:inline-block; width:8px;"></span>';
        }
        const warnaAcak = warnaLed[Math.floor(Math.random() * warnaLed.length)];
        return `<span class="led-letter ${warnaAcak}">${huruf}</span>`;
    }
    
    // Buat teks utama
    let html = '';
    for (let i = 0; i < teks.length; i++) {
        html += buatHurufLed(teks[i]);
    }
    
    // Tambahkan separator LED dots
    html += `<span class="led-dot led-dot-red"></span>`;
    html += `<span class="led-dot led-dot-green"></span>`;
    html += `<span class="led-dot led-dot-blue"></span>`;
    
    // Duplikat teks untuk efek running (agar tidak putus)
    for (let i = 0; i < teks.length; i++) {
        html += buatHurufLed(teks[i]);
    }
    
    // Tambahkan lagi LED dots
    html += `<span class="led-dot led-dot-red"></span>`;
    html += `<span class="led-dot led-dot-green"></span>`;
    html += `<span class="led-dot led-dot-blue"></span>`;
    
    // Duplikat sekali lagi
    for (let i = 0; i < teks.length; i++) {
        html += buatHurufLed(teks[i]);
    }
    
    textWrapper.innerHTML = html;
    container.appendChild(textWrapper);
    
    // Cari posisi untuk menyisipkan (setelah splash screen, sebelum app container)
    const splashScreen = document.getElementById('splashScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (splashScreen && splashScreen.parentNode) {
        // Sisipkan setelah splash screen
        splashScreen.insertAdjacentElement('afterend', container);
    } else if (appContainer && appContainer.parentNode) {
        // Sisipkan sebelum app container
        appContainer.parentNode.insertBefore(container, appContainer);
    } else {
        // Fallback: sisipkan di body bagian atas
        document.body.insertBefore(container, document.body.firstChild);
    }
    
    console.log('✅ LED Running Text ditambahkan!');
}

// Jalankan saat halaman siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(buatLedRunningText, 500);
    });
} else {
    setTimeout(buatLedRunningText, 500);
}

// ==========================================
// KNIGHT RIDER EFFECT UNTUK HANPANGAN
// ==========================================

function buatKnightRiderHanpangan() {
    // Cari elemen running text hanpangan
    const runningTextEl = document.getElementById('runningTextJadwalBaru');
    if (!runningTextEl) {
        setTimeout(buatKnightRiderHanpangan, 1000);
        return;
    }
    
    // Cek apakah sudah di-wrap
    if (runningTextEl.parentElement.classList.contains('knight-rider-container')) return;
    
    // Ambil teks asli
    const teksAsli = runningTextEl.textContent;
    
    // Buat container baru dengan efek Knight Rider
    const container = document.createElement('div');
    container.className = 'knight-rider-container';
    
    // Buat teks dengan efek LED per huruf
    const textSpan = document.createElement('span');
    textSpan.className = 'knight-rider-text';
    
    // Efek per huruf dengan delay berbeda
    let html = '';
    for (let i = 0; i < teksAsli.length; i++) {
        const huruf = teksAsli[i];
        if (huruf === ' ') {
            html += '<span style="display:inline-block; width:8px;"></span>';
        } else {
            html += `<span class="knight-rider-letter" style="--i: ${i % 10}">${huruf}</span>`;
        }
    }
    textSpan.innerHTML = html;
    
    // Tambahkan scanner effect
    const scanner = document.createElement('div');
    scanner.className = 'knight-rider-scanner';
    
    container.appendChild(textSpan);
    container.appendChild(scanner);
    
    // Ganti elemen asli
    runningTextEl.parentNode.replaceChild(container, runningTextEl);
    
    console.log('✅ Knight Rider effect added to hanpangan text!');
}

// Jalankan setelah halaman siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(buatKnightRiderHanpangan, 1500);
    });
} else {
    setTimeout(buatKnightRiderHanpangan, 1500);
}
