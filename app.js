// ================= KONFIGURASI AMAN =================
const GOOGLE_APPS_SCRIPT_WEBHOOK = "https://script.google.com/macros/s/AKfycbz3sB1d0PRRzlvAJwdr8nl5dQa6qpyfHQCJbYxBMz0Jpj2o-i1_WnwMzJEy3Z4GA9uh/exec";
const TARGET_LAPORAN = 9;

// ================= VARIABEL GLOBAL =================
let img = new Image();
let selectedDesa = "";
let kordinatList = [];
let currentKoordinat = "";
let tanggalWaktu = "";
let submissionCount = 0;
let submittedDates = [];
let desaCounter = {};
let attendanceData = [];
let deferredPrompt = null;

let currentApp = null;
let isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ================= SPLASH SCREEN =================
document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 DOM Content Loaded");
    const splashScreen = document.getElementById('splashScreen');
    const appContainer = document.getElementById('appContainer');
    const progressBar = document.getElementById('splashProgressBar');
    const progressText = document.getElementById('progressPercentage');

    if (!splashScreen) return;

    let progress = 0;
    let isAppOpened = false;

    function updateProgress(value, message) {
        progress = Math.min(value, 100);
        if (progressBar) progressBar.style.width = progress + '%';
        if (progressText) progressText.textContent = Math.round(progress) + '%';
        console.log(`Progress: ${progress}% - ${message}`);

        if (progress >= 75 && progress < 98) {
            const tp = (progress - 75) / (98 - 75);
            splashScreen.style.opacity = 1 - tp;
            appContainer.style.opacity = tp;
            appContainer.style.display = 'block';
        }
        if (progress >= 98) {
            splashScreen.style.opacity = 0;
            splashScreen.style.pointerEvents = 'none';
            appContainer.style.opacity = 1;
            appContainer.style.display = 'block';
        }
        if (progress >= 100 && !isAppOpened) {
            isAppOpened = true;
            setTimeout(() => {
                splashScreen.style.display = 'none';
                loadDukopsApp();
            }, 200);
        }
    }

    const stages = [
        { percent: 33, message: "Memuat sistem..." },
        { percent: 66, message: "Menyiapkan aplikasi..." },
        { percent: 100, message: "Aplikasi Siap digunakan" }
    ];
    let idx = 0;
    const delay = isMobileDevice ? 400 : 800;
    function nextStage() {
        if (idx >= stages.length) return;
        const s = stages[idx];
        updateProgress(s.percent, s.message);
        idx++;
        setTimeout(nextStage, delay);
    }
    nextStage();
});

// ================= LOAD APP =================
function loadDukopsApp() {
    currentApp = 'dukops';
    showApp();
    initializeApp();
}

function showApp() {
    const splash = document.getElementById('splashScreen');
    const app = document.getElementById('appContainer');
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 0.8s ease';
    setTimeout(() => {
        splash.style.display = 'none';
        app.style.display = 'block';
        setTimeout(() => {
            app.style.opacity = '1';
            if (currentApp === 'dukops') {
                document.getElementById('btnDukops').classList.add('active');
                document.getElementById('dukopsContent').style.display = 'block';
                document.getElementById('absenContent').style.display = 'none';
                document.getElementById('hanpanganContent').style.display = 'none';
                document.getElementById('hanpanganContent').classList.remove('active');
            } else {
                document.getElementById('btnDukops').classList.remove('active');
                document.getElementById('dukopsContent').style.display = 'none';
                document.getElementById('absenContent').style.display = 'block';
                document.getElementById('hanpanganContent').style.display = 'none';
                document.getElementById('hanpanganContent').classList.remove('active');
            }
        }, 100);
    }, 800);
}

// ================= NAVIGASI TAB =================
window.showDukops = function() {
    document.getElementById('dukopsContent').style.display = 'block';
    document.getElementById('absenContent').style.display = 'none';
    document.getElementById('hanpanganContent').style.display = 'none';
    document.getElementById('hanpanganContent').classList.remove('active');
    document.getElementById('btnDukops').classList.add('active');
    document.getElementById('btnAbsen').classList.remove('active');
    document.getElementById('btnHanpangan').classList.remove('active');
    currentApp = 'dukops';
};

window.showAbsenTab = function() {
    document.getElementById('dukopsContent').style.display = 'none';
    document.getElementById('absenContent').style.display = 'block';
    document.getElementById('hanpanganContent').style.display = 'none';
    document.getElementById('hanpanganContent').classList.remove('active');
    document.getElementById('btnDukops').classList.remove('active');
    document.getElementById('btnAbsen').classList.add('active');
    document.getElementById('btnHanpangan').classList.remove('active');
    if (typeof loadAbsenTahun === 'function') loadAbsenTahun();
};

window.showHanpangan = function() {
    document.getElementById('dukopsContent').style.display = 'none';
    document.getElementById('absenContent').style.display = 'none';
    document.getElementById('hanpanganContent').style.display = 'block';
    document.getElementById('hanpanganContent').classList.add('active');
    document.getElementById('btnDukops').classList.remove('active');
    document.getElementById('btnAbsen').classList.remove('active');
    document.getElementById('btnHanpangan').classList.add('active');
};

// ================= BACKEND =================
async function sendToBackend(action, data = {}) {
    try {
        if (action === 'listFiles' || action === 'getConfig' || action === 'test' || action === 'telegramTest') {
            let url = `${GOOGLE_APPS_SCRIPT_WEBHOOK}?action=${action}`;
            if (action === 'listFiles') {
                if (data.desaFilter) url += `&desaFilter=${encodeURIComponent(data.desaFilter)}`;
                if (data.monthFilter) url += `&monthFilter=${encodeURIComponent(data.monthFilter)}`;
                if (data.readZips) url += `&readZips=true`;
            }
            const response = await fetch(url);
            return await response.json();
        } else {
            const formData = new FormData();
            formData.append('action', action);
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null) {
                    if (key === 'fileData' && typeof data[key] === 'string') {
                        formData.append(key, data[key]);
                    } else {
                        formData.append(key, String(data[key]));
                    }
                }
            });
            const response = await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        }
    } catch (error) {
        console.error(`Error in ${action}:`, error);
        return { success: false, error: error.message };
    }
}

async function uploadToGoogleDrive(zipBlob, zipFileName, desaName, date) {
    try {
        const base64Data = await blobToBase64(zipBlob);
        const desaInfo = normalizeDesaName(desaName);
        const result = await sendToBackend('uploadDrive', {
            fileName: zipFileName,
            desaName: desaInfo.cleanName,
            fileData: base64Data,
            year: date.getFullYear().toString(),
            month: date.toLocaleDateString('id-ID', { month: 'long' }),
            desa: desaInfo.cleanName,
            mimeType: 'application/zip'
        });
        return result.success === true;
    } catch (error) {
        console.error('Error upload ke Drive:', error);
        return false;
    }
}

async function sendZipToTelegram(zipBlob, filename, desaName) {
    try {
        const base64Data = await blobToBase64(zipBlob);
        const desaInfo = normalizeDesaName(desaName);
        const result = await sendToBackend('sendTelegram', {
            fileName: filename,
            desaName: desaInfo.cleanName,
            fileData: base64Data,
            mimeType: 'application/zip'
        });
        return result.success === true;
    } catch (error) {
        console.error('Error send to Telegram:', error);
        return false;
    }
}

async function blobToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

// ================= PWA INSTALL =================
function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setTimeout(() => {
            const btn = document.getElementById('installButton');
            if (btn) {
                btn.style.display = 'flex';
                btn.addEventListener('click', async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                            btn.style.display = 'none';
                            showNotification('✅ Aplikasi berhasil diinstall!', 'success');
                        }
                        deferredPrompt = null;
                    }
                });
            }
        }, 3000);
    });
    window.addEventListener('appinstalled', () => {
        const btn = document.getElementById('installButton');
        if (btn) btn.style.display = 'none';
        deferredPrompt = null;
    });
}

// ================= FUNGSI DUKOPS =================
function initializeApp() {
    console.log("🔄 Initializing DUKOPS app...");
    try {
        const savedCount = localStorage.getItem('dukopsSubmissionCount');
        submissionCount = savedCount ? parseInt(savedCount) : 0;
        document.getElementById('submissionCounter').textContent = submissionCount;
        if (submissionCount > 0) {
            document.getElementById('submissionCounter').style.display = 'inline-block';
        }

        loadDesaList();
        loadLastSubmittedDates();
        loadDesaCounter();

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('tanggalWaktu').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        updateDatePreview();

        setupInstallPrompt();
        resetCanvas();

        setTimeout(() => {
            showNotification('✅ Sistem DUKOPS BABINSA siap digunakan!', 'success');
        }, 500);

        console.log("✅ DUKOPS App initialized successfully");
    } catch (error) {
        console.error("❌ Error initializing DUKOPS app:", error);
        showNotification('❌ Gagal memuat aplikasi DUKOPS', 'error');
    }
}

async function loadDesaList() {
    const select = document.getElementById('selectDesa');
    const loading = document.getElementById('loadingDesa');
    if (!select) return;
    loading.style.display = 'block';

    try {
        const response = await fetch('data/desa-list.json?t=' + Date.now());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const desaList = data.desaList || [];

        select.innerHTML = '<option value="">-- Pilih Desa --</option>';
        desaList.forEach(desaName => {
            const option = document.createElement('option');
            const jsonPath = `data/coordinates/${desaName}.json`;
            option.value = jsonPath;
            option.textContent = normalizeDesaName(desaName).cleanName;
            option.setAttribute('data-raw-name', desaName);
            select.appendChild(option);
        });
        console.log(`✅ Loaded ${desaList.length} desas from server`);
        showNotification('✅ Daftar desa berhasil dimuat', 'success');
    } catch (error) {
        console.error("❌ Error loading desa list:", error);
        select.innerHTML = '<option value="">-- Gagal memuat desa --</option>';
        select.disabled = true;
        showNotification('❌ Gagal memuat daftar desa. Periksa koneksi.', 'error');
    } finally {
        loading.style.display = 'none';
    }
}

function normalizeDesaName(desaName) {
    if (!desaName) return { original: "", normalized: "", forTelegram: "", cleanName: "" };
    let normalized = desaName.replace(/^Desa\s+/i, '').replace(/^Kelurahan\s+/i, '').replace(/Kel\.\s*/gi, '').replace(/Kel\s/gi, '').trim();
    const forTelegram = normalized.replace(/_/g, ' ');
    return {
        original: desaName,
        normalized: normalized,
        forTelegram: forTelegram,
        cleanName: forTelegram.trim()
    };
}

async function loadSelectedDesa() {
    const select = document.getElementById('selectDesa');
    const jsonPath = select.value;
    const loading = document.getElementById('loadingKoordinat');

    if (!jsonPath) { resetForm(); return; }

    const selectedOption = select.options[select.selectedIndex];
    selectedDesa = selectedOption.getAttribute('data-raw-name') || selectedOption.text;

    updateDesaHeaderImage(selectedDesa);
    updateAttendanceButtonState();
    updateAttendanceSelectedDesaLabel();

    if (document.getElementById('attendancePanel')?.style.display === 'block') {
        loadAttendanceData();
    }

    const desaInfo = normalizeDesaName(selectedDesa);
    document.getElementById('previewDesa').textContent = desaInfo.cleanName;
    document.getElementById('previewDesa').style.display = 'block';

    const fotoLabel = document.getElementById('labelFotoKegiatan');
    if (fotoLabel) fotoLabel.innerHTML = `<i class="fas fa-camera"></i> Foto Kegiatan: ${desaInfo.cleanName}`;

    loading.style.display = 'block';
    document.getElementById('previewKordinat').textContent = "Memuat koordinat...";

    try {
        console.log(`📂 Fetching coordinates from: ${jsonPath}`);
        const response = await fetch(jsonPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const jsonData = await response.json();
        if (!jsonData.coordinates || !Array.isArray(jsonData.coordinates)) {
            throw new Error("Format JSON koordinat tidak valid");
        }
        kordinatList = jsonData.coordinates.map(coord => `${coord.lat},${coord.lon},${coord.elevation}`);
        console.log(`📌 Loaded ${kordinatList.length} coordinates`);
        if (kordinatList.length === 0) throw new Error("File koordinat kosong");
        pickRandomKoordinat();
        showNotification(`Koordinat ${desaInfo.cleanName} dimuat (${kordinatList.length} titik)`, "success");
    } catch (error) {
        console.error("❌ Error loading coordinates:", error);
        document.getElementById('previewKordinat').textContent = "Gagal memuat koordinat";
        showNotification("Gagal memuat koordinat: " + error.message, "error");
    } finally {
        loading.style.display = 'none';
        updatePreview();
        checkInputCompletion();
    }
}

function pickRandomKoordinat() {
    if (kordinatList.length === 0) {
        showNotification("Tidak ada data koordinat tersedia", "warning");
        return;
    }
    if (!selectedDesa) {
        showNotification("Pilih desa terlebih dahulu", "warning");
        return;
    }
    const coordElement = document.getElementById('previewKordinat');
    coordElement.style.transition = "opacity 0.3s";
    coordElement.style.opacity = "0";
    setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * kordinatList.length);
        currentKoordinat = kordinatList[randomIndex];
        coordElement.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + currentKoordinat;
        setTimeout(() => { coordElement.style.opacity = "1"; }, 50);
        updatePreview();
        checkInputCompletion();
    }, 300);
}

function previewImage() {
    const file = document.getElementById("gambar").files[0];
    const preview = document.getElementById("previewGambar");

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                try {
                    if (img.height > img.width) {
                        document.getElementById("gambar").value = "";
                        if (preview) preview.textContent = "";
                        img = new Image();
                        showNotification("Foto portrait tidak diperbolehkan. Gunakan foto landscape.", "warning");
                        checkInputCompletion();
                        return;
                    }
                } catch (e) {}
                if (kordinatList.length > 0) pickRandomKoordinat();
                preview.textContent = file.name;
                updatePreview();
            };
            img.onerror = function() {
                showNotification("Gagal memuat gambar", "error");
                document.getElementById("gambar").value = "";
                preview.textContent = "";
            };
        };
        reader.onerror = function() { showNotification("Gagal membaca file", "error"); };
        reader.readAsDataURL(file);
    } else {
        img = new Image();
        updatePreview();
    }
    checkInputCompletion();
}

function updateDatePreview() {
    const tglInput = document.getElementById("tanggalWaktu").value;
    const label = document.getElementById('tanggalWaktuLabelText');

    if (tglInput) {
        let date = new Date(tglInput);
        date.setSeconds(Math.floor(Math.random() * 60));
        tanggalWaktu = date.toISOString();
        const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const displayText = date.toLocaleString('id-ID', options).replace(/:/g, '.');
        if (label) label.textContent = displayText;
    } else {
        tanggalWaktu = "";
        if (label) label.textContent = 'Pilih tanggal & waktu';
    }
    updatePreview();
    checkInputCompletion();
}

function updatePreview() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    if (img.src && img.complete) {
        canvas.width = 800;
        canvas.height = Math.round(canvas.width * (img.height / img.width));
    } else {
        canvas.width = 800;
        canvas.height = Math.round(canvas.width * (9 / 16));
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (img.src && img.complete) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (selectedDesa || currentKoordinat || tanggalWaktu) {
        ctx.textAlign = "right";
        ctx.font = "36px Arial";
        const bottomMargin = 20;
        const lineHeight = 40;
        const rightMargin = 10;

        if (selectedDesa) {
            const desaInfo = normalizeDesaName(selectedDesa);
            const displayDesaName = desaInfo.cleanName;
            const watermarkText = (displayDesaName === "Sukasada" || displayDesaName === "SUKASADA")
                ? "Babinsa Kelurahan Sukasada"
                : "Babinsa " + displayDesaName;
            ctx.fillStyle = "white";
            ctx.fillText(watermarkText, canvas.width - rightMargin, canvas.height - bottomMargin - (lineHeight * 2));
        }

        if (currentKoordinat) {
            ctx.fillStyle = "white";
            ctx.fillText(currentKoordinat, canvas.width - rightMargin, canvas.height - bottomMargin - lineHeight);
        }

        if (tanggalWaktu) {
            const date = new Date(tanggalWaktu);
            let dateText = date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) +
                ", " + date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            ctx.fillStyle = "white";
            ctx.fillText(dateText, canvas.width - rightMargin, canvas.height - bottomMargin);
        }
    }
}

async function processSubmission() {
    if (!validateSubmission()) return;
    if (isSameDateMonthSubmission()) {
        showNotification("⚠ Sudah ada laporan di tanggal dan bulan yang sama!", "warning");
        return;
    }

    const button = document.getElementById("submitBtn");
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

    try {
        const canvas = document.getElementById("canvas");
        const imgData = canvas.toDataURL("image/png");
        const narasi = document.getElementById("narasi").value;
        const date = new Date(tanggalWaktu);

        const day = String(date.getDate()).padStart(2, '0');
        const monthNum = String(date.getMonth() + 1);
        const monthName = date.toLocaleDateString('id-ID', { month: 'long' });
        const year = date.getFullYear();

        const desaInfo = normalizeDesaName(selectedDesa);

        const fileNameInsideZipImage = `${desaInfo.cleanName} ${day} ${monthName} ${year} Dukops.png`;
        const fileNameInsideZipNarasi = `${desaInfo.cleanName} ${day} ${monthName} ${year} Narasi.txt`;
        const zipFileNameForDownload = `${desaInfo.cleanName} ${day} ${monthNum} ${year}.zip`;
        const zipFileNameForBackend = `${desaInfo.cleanName} ${day} ${monthNum} ${year}.zip`;

        const formattedDate = date.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const narasiContent = `${formattedDate}\tBabinsa ${desaInfo.cleanName} ${narasi}`;

        const zip = new JSZip();
        zip.file(fileNameInsideZipNarasi, narasiContent);
        zip.file(fileNameInsideZipImage, imgData.split("base64,")[1], { base64: true });

        const content = await zip.generateAsync({ type: "blob" });

        // Download
        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = zipFileNameForDownload;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Kirim Telegram
        await sendZipToTelegram(content, zipFileNameForBackend, selectedDesa);

        // Upload Drive
        const driveUploaded = await uploadToGoogleDrive(content, zipFileNameForBackend, selectedDesa, date);

        // Update counter
        const desaData = updateDesaCounter(selectedDesa, zipFileNameForBackend);

        if (document.getElementById('attendancePanel').style.display === 'block') {
            setTimeout(() => loadAttendanceData(), 2000);
        }

        if (driveUploaded) {
            showNotification(`✔ Laporan berhasil disimpan (${desaData.count}/${TARGET_LAPORAN} laporan)`, "success");
        } else {
            showNotification(`⚠ Laporan hanya didownload, gagal simpan ke Drive`, "warning");
        }

        if (desaData.count >= 9) {
            showThankYouPopup(desaInfo.cleanName, desaData.count);
            await sendThankYouTelegram(desaInfo.cleanName, desaData.count);
        }

        updateCounter();
        saveSubmittedDate(tanggalWaktu);

    } catch (error) {
        console.error("Error:", error);
        showNotification("❌ Gagal mengirim laporan", "error");
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

function validateSubmission() {
    if (!selectedDesa) { showNotification("Masukkan nama desa terlebih dahulu", "warning"); return false; }
    if (!currentKoordinat) { showNotification("Koordinat tidak valid", "warning"); return false; }
    if (!tanggalWaktu) { showNotification("Isi tanggal dan waktu", "warning"); return false; }
    if (!img.src || !img.complete) { showNotification("Upload foto kegiatan", "warning"); return false; }
    const narasi = document.getElementById("narasi").value.trim();
    if (!narasi) { showNotification("Isi narasi kegiatan", "warning"); return false; }

    const desaInfo = normalizeDesaName(selectedDesa);
    const date = new Date(tanggalWaktu);
    const day = String(date.getDate()).padStart(2, '0');
    const monthName = date.toLocaleDateString('id-ID', { month: 'long' });
    const monthNum = String(date.getMonth() + 1);
    const year = date.getFullYear();

    let confirmMsg = `Anda yakin ingin mengirim laporan untuk ${desaInfo.cleanName}?\n\n`;
    confirmMsg += `File ZIP akan:\n`;
    confirmMsg += `1. Didownload: ${desaInfo.cleanName} ${day} ${monthNum} ${year}.zip\n`;
    confirmMsg += `2. Berisi file:\n   - ${desaInfo.cleanName} ${day} ${monthName} ${year} Dukops.png\n`;
    confirmMsg += `   - ${desaInfo.cleanName} ${day} ${monthName} ${year} Narasi.txt\n`;
    confirmMsg += `3. Dikirim ke Telegram & Drive: ${desaInfo.cleanName} ${day} ${monthNum} ${year}.zip`;

    return confirm(confirmMsg);
}

function isSameDateMonthSubmission() {
    if (!tanggalWaktu) return false;
    const currentDate = new Date(tanggalWaktu);
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth();
    return submittedDates.some(dateStr => {
        const date = new Date(dateStr);
        return date.getDate() === currentDay && date.getMonth() === currentMonth;
    });
}

function resetCanvas() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = Math.round(canvas.width / (16 / 9));
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function resetAll() {
    if (confirm("Apakah Anda yakin ingin mereset SEMUA data?\n\n• Counter laporan terkirim\n• Log pengiriman\n• Tanggal terakhir\n• Counter per desa\n• Form input\n\nAksi ini tidak dapat dibatalkan!")) {
        submissionCount = 0;
        document.getElementById('submissionCounter').textContent = '0';
        localStorage.setItem('dukopsSubmissionCount', '0');
        submittedDates = [];
        localStorage.removeItem('dukopsSubmittedDates');
        desaCounter = {};
        localStorage.removeItem('dukopsDesaCounter');
        resetForm();
        showNotification("Semua data telah direset", "success");
    }
}

function resetForm() {
    selectedDesa = "";
    kordinatList = [];
    currentKoordinat = "";
    document.getElementById('selectDesa').value = "";
    document.getElementById('previewDesa').textContent = "";
    document.getElementById('previewKordinat').textContent = "";
    document.getElementById('narasi').value = "";
    document.getElementById('gambar').value = "";
    document.getElementById('tanggalWaktu').value = "";
    const label = document.getElementById('tanggalWaktuLabelText');
    if (label) label.textContent = 'Pilih tanggal & waktu';
    document.getElementById('previewGambar').textContent = "";
    updateDesaHeaderImage("");
    checkInputCompletion();
    updatePreview();
    resetCanvas();
}

function loadDesaCounter() {
    const saved = localStorage.getItem('dukopsDesaCounter');
    desaCounter = saved ? JSON.parse(saved) : {};
}

function updateCounter() {
    submissionCount++;
    document.getElementById('submissionCounter').textContent = submissionCount;
    document.getElementById('submissionCounter').style.display = 'inline-block';
    localStorage.setItem('dukopsSubmissionCount', submissionCount.toString());
}

function updateDesaCounter(desaName, fileName) {
    const date = new Date(tanggalWaktu);
    const monthYear = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    if (!desaCounter[desaName]) {
        desaCounter[desaName] = { count: 0, files: [], month: monthYear };
    }

    if (desaCounter[desaName].month !== monthYear) {
        desaCounter[desaName] = { count: 1, files: [fileName], month: monthYear };
    } else {
        desaCounter[desaName].count++;
        desaCounter[desaName].files.push(fileName);
        if (desaCounter[desaName].files.length > TARGET_LAPORAN) {
            desaCounter[desaName].files.shift();
        }
    }

    localStorage.setItem('dukopsDesaCounter', JSON.stringify(desaCounter));
    return desaCounter[desaName];
}

function saveSubmittedDate(dateStr) {
    submittedDates.push(dateStr);
    localStorage.setItem('dukopsSubmittedDates', JSON.stringify(submittedDates));
}

function loadLastSubmittedDates() {
    const saved = localStorage.getItem('dukopsSubmittedDates');
    submittedDates = saved ? JSON.parse(saved) : [];
}

function checkInputCompletion() {
    const isComplete = selectedDesa &&
        currentKoordinat &&
        tanggalWaktu &&
        img.src &&
        img.complete &&
        document.getElementById("narasi").value.trim();

    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) submitBtn.disabled = !isComplete;
    updateAttendanceButtonState();
}

function updateAttendanceButtonState() {
    const btn = document.getElementById('showAttendanceBtn');
    if (btn) btn.disabled = !selectedDesa;
}

function updateAttendanceSelectedDesaLabel() {
    const label = document.getElementById('attendanceSelectedDesaName');
    if (label) label.textContent = selectedDesa ? normalizeDesaName(selectedDesa).cleanName : 'Silahkan Pilih Desa';
}

function autoResizeNarasi(target) {
    const textarea = target instanceof HTMLTextAreaElement ? target : document.getElementById('narasi');
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.overflowY = 'hidden';
    const desiredHeight = Math.max(textarea.scrollHeight, textarea.offsetHeight);
    textarea.style.height = `${desiredHeight}px`;
    textarea.style.minHeight = '150px';
}

function updateDesaHeaderImage(desaName) {
    const headerImage = document.getElementById('desaProfileImgHeader');
    if (!headerImage) return;
    const defaultUrl = 'icons/favicon-96x96.png';
    if (!desaName) {
        headerImage.src = defaultUrl;
        return;
    }
    const desaInfo = normalizeDesaName(desaName);
    const imageName = desaInfo.normalized;
    const localUrl = `profile/${imageName}.png`;
    headerImage.src = localUrl;
}

// ================= FUNGSI ABSENSI =================
function showAttendance() {
    const panel = document.getElementById('attendancePanel');
    const button = document.getElementById('showAttendanceBtn');
    if (panel && button) {
        panel.style.display = 'block';
        button.style.display = 'none';
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        document.getElementById('attendanceMonthFilter').value = `${year}-${month}`;
        updateAttendanceSelectedDesaLabel();
        loadAttendanceData();
    }
}

function hideAttendance() {
    const panel = document.getElementById('attendancePanel');
    const button = document.getElementById('showAttendanceBtn');
    if (panel && button) {
        panel.style.display = 'none';
        button.style.display = 'block';
    }
}

async function loadAttendanceData() {
    const loading = document.getElementById('attendanceLoading');
    const list = document.getElementById('attendanceList');
    const summary = document.getElementById('attendanceSummary');
    if (!loading || !list) return;

    loading.style.display = 'block';
    list.innerHTML = '';
    if (summary) summary.style.display = 'none';

    try {
        const result = await sendToBackend('listFiles', {
            desaFilter: selectedDesa ? normalizeDesaName(selectedDesa).cleanName : '',
            monthFilter: document.getElementById('attendanceMonthFilter').value,
            readZips: 'true'
        });

        if (result.success) {
            attendanceData = result.files || [];
            const selectedMonth = document.getElementById('attendanceMonthFilter').value;
            if (selectedMonth) {
                const [year, month] = selectedMonth.split('-');
                attendanceData = attendanceData.filter(file => {
                    const fileMonth = file.month || extractMonthYearFromFileName(file.name);
                    return fileMonth === `${year}-${month}`;
                });
            }
            displayAttendanceList(attendanceData);
            displayAttendanceSummary(attendanceData);
            showNotification(`✅ Data absensi dimuat (${attendanceData.length} file)`, "success");
        } else {
            showNotification("❌ Gagal memuat data absensi", "error");
            list.innerHTML = `<div style="text-align: center; color: #f44336; padding: 20px;">
                <i class="fas fa-exclamation-circle"></i><br>
                Gagal memuat data absensi.<br>
                <small>Pastikan koneksi internet aktif.</small>
            </div>`;
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        list.innerHTML = `<div style="text-align: center; color: #f44336; padding: 20px;">
            <i class="fas fa-exclamation-circle"></i><br>
            Gagal terhubung ke server.<br>
            <small>Periksa koneksi internet.</small>
        </div>`;
    } finally {
        loading.style.display = 'none';
    }
}

function extractMonthYearFromFileName(filename) {
    const match = filename.match(/(\d{1,2})\s+(\d{4})\.zip$/);
    if (match) {
        const month = match[1].padStart(2, '0');
        const year = match[2];
        return `${year}-${month}`;
    }
    return '';
}

function displayAttendanceList(files) {
    const list = document.getElementById('attendanceList');
    if (!list) return;

    if (!files || files.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: #a5a5a5; padding: 20px;">
            <i class="fas fa-folder-open"></i><br>
            Tidak ada data laporan
        </div>`;
        return;
    }

    const grouped = {};
    files.forEach(file => {
        const monthYear = file.month || extractMonthYearFromFileName(file.name);
        if (!grouped[monthYear]) grouped[monthYear] = { month: monthYear, files: [], desas: new Set() };
        grouped[monthYear].files.push(file);
        const desaName = file.desa || extractDesaFromFileName(file.name);
        grouped[monthYear].desas.add(desaName);
    });

    const sorted = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    let html = '';
    sorted.forEach(monthYear => {
        const g = grouped[monthYear];
        const [year, month] = monthYear.split('-');
        const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        const monthName = monthNames[parseInt(month) - 1];

        html += `<div class="desa-card" style="margin-bottom: 20px;">
            <div class="desa-header" style="background: #cc5500; padding: 8px 12px; border-radius: 8px 8px 0 0; display:flex; justify-content:space-between; color:white;">
                <div class="desa-name"><i class="fas fa-folder"></i> ${monthName} ${year}</div>
                <div class="desa-count">${g.files.length} laporan | ${g.desas.size} desa</div>
            </div>
            <div class="desa-files" style="padding: 0 4px;">`;

        const byDesa = {};
        g.files.forEach(file => {
            const d = file.desa || extractDesaFromFileName(file.name);
            if (!byDesa[d]) byDesa[d] = [];
            byDesa[d].push(file);
        });

        Object.entries(byDesa).forEach(([desaName, desaFiles]) => {
            const count = desaFiles.length;
            const complete = count >= TARGET_LAPORAN;
            html += `<div class="desa-card" style="margin: 10px 0; border-left: 4px solid ${complete ? '#4CAF50' : '#FF9800'}; background: rgba(255,255,255,0.02); border-radius:4px;">
                <div class="desa-header" style="padding: 6px 10px; display:flex; justify-content:space-between; font-size:14px;">
                    <div class="desa-name"><strong>${desaName}</strong></div>
                    <div class="desa-count" style="color:${complete ? '#4CAF50' : '#FF9800'}">${count}/${TARGET_LAPORAN}</div>
                </div>
                <div class="desa-files" style="padding: 2px 10px 6px;">`;
            desaFiles.sort((a,b) => new Date(b.createdTime) - new Date(a.createdTime));
            desaFiles.forEach((file, idx) => {
                const date = new Date(file.createdTime);
                const dateStr = date.toLocaleDateString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
                const size = file.size ? formatFileSize(file.size) : '?';
                const zipContents = file.zipContents ? `** Isi ZIP: ${file.zipContents}` : '';
                const displayIdx = desaFiles.length - idx;
                html += `<div style="padding: 4px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:13px;">
                    <div>${displayIdx}. ${file.name}</div>
                    <div style="font-size:11px; color:#8899aa;">${dateStr} • ${size} ${zipContents ? '• '+zipContents : ''}</div>
                </div>`;
            });
            html += `</div></div>`;
        });

        html += `</div></div>`;
    });
    list.innerHTML = html;
}

function displayAttendanceSummary(files) {
    const summary = document.getElementById('attendanceSummary');
    const totalReports = document.getElementById('totalReports');
    const totalDesa = document.getElementById('totalDesa');
    const targetStatus = document.getElementById('targetStatus');

    if (!summary || !files || files.length === 0) {
        if (summary) summary.style.display = 'none';
        return;
    }

    summary.style.display = 'block';
    if (totalReports) totalReports.textContent = files.length;

    const uniqueDesas = new Set();
    files.forEach(file => {
        const d = file.desa || extractDesaFromFileName(file.name);
        uniqueDesas.add(d);
    });
    if (totalDesa) totalDesa.textContent = uniqueDesas.size;

    const counts = {};
    files.forEach(file => {
        const d = file.desa || extractDesaFromFileName(file.name);
        counts[d] = (counts[d] || 0) + 1;
    });

    let achieved = 0;
    const possible = uniqueDesas.size * TARGET_LAPORAN;
    Object.values(counts).forEach(c => { achieved += Math.min(c, TARGET_LAPORAN); });
    const percent = possible > 0 ? (achieved / possible * 100) : 0;

    if (targetStatus) {
        targetStatus.textContent = `${percent.toFixed(1)}%`;
        targetStatus.style.color = percent >= 100 ? '#4CAF50' : percent >= 70 ? '#FF9800' : '#f44336';
    }
}

function extractDesaFromFileName(filename) {
    const clean = filename.replace(/_/g, ' ').replace(/\.zip$/, '').replace(/\s+\d{1,2}\s+\d{4}$/, '').trim();
    const select = document.getElementById('selectDesa');
    if (!select) return clean;
    for (let i = 1; i < select.options.length; i++) {
        const opt = select.options[i];
        const info = normalizeDesaName(opt.getAttribute('data-raw-name') || opt.text);
        if (clean.toLowerCase().includes(info.cleanName.toLowerCase()) ||
            info.cleanName.toLowerCase().includes(clean.toLowerCase())) {
            return info.cleanName;
        }
    }
    return clean;
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function refreshAttendanceData() { loadAttendanceData(); }

// ================= POPUP UCAPAN TERIMA KASIH =================
function showThankYouPopup(desaName, count) {
    const modal = document.createElement('div');
    modal.className = 'thankyou-popup';
    modal.style.cssText = `
        position: fixed; top:0; left:0; right:0; bottom:0;
        background: rgba(0,0,0,0.85); z-index:999999;
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.3s;
    `;
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a3a1a, #0a1a0a);
            border: 2px solid #4CAF50; border-radius: 20px; padding: 40px;
            max-width: 450px; width: 90%; text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
            <div style="font-size: 80px; color: #4CAF50; margin-bottom: 20px;">
                <i class="fas fa-trophy"></i>
            </div>
            <h2 style="color: #9fd49f; margin-bottom: 15px; font-size: 28px;">🎉 SELAMAT! 🎉</h2>
            <p style="color: #f5f5f5; font-size: 18px; line-height: 1.5; margin-bottom: 20px;">
                <strong>Babinsa ${desaName}</strong><br>
                Telah menyelesaikan <strong>${count} laporan</strong> untuk bulan ini!
            </p>
            <div style="background: rgba(76, 175, 80, 0.2); border: 2px solid #4CAF50;
                border-radius: 10px; padding: 15px; margin: 20px 0; font-size: 16px; color: #b2d8b2;">
                <i class="fas fa-check-circle"></i> Target 9 laporan per bulan TERCAPAI!
            </div>
            <button onclick="this.closest('.thankyou-popup').remove()"
                style="background: linear-gradient(135deg, #4CAF50, #2b4d2b); color: white;
                border: none; padding: 12px 25px; border-radius: 8px; font-size: 16px;
                font-weight: bold; cursor: pointer; width: 100%;">
                <i class="fas fa-thumbs-up"></i> TERIMA KASIH
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => { if (modal.parentNode) modal.remove(); }, 10000);
}

async function sendThankYouTelegram(desaName, count) {
    try {
        const message = `🎉 *SELAMAT!* 🎉

*Babinsa ${desaName}* telah menyelesaikan *${count} laporan DUKOPS* untuk bulan ini!

✅ *Target 9 laporan per bulan TERCAPAI!*

Terima kasih atas dedikasi dan kerja keras dalam melaksanakan tugas DUKOPS.

*KORAMIL 1609-05/SUKASADA*
*Kodim 1609/Buleleng*`;

        await sendToBackend('sendTelegramText', {
            message: message,
            chatId: '-1003020813628'
        });
    } catch (error) {
        console.error('Gagal mengirim ucapan terima kasih ke Telegram:', error);
    }
}

function showNotification(message, type) {
    const toast = document.getElementById('win98Toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'win98-toast show';
    if (type === 'success') toast.className += ' success';
    else if (type === 'error') toast.className += ' error';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ================= TAB ABSEN (Google Apps Script) =================
(function() {
    var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxcKBFM8Mm0A8e_hWfl48uEUuDhlmxK8okgXF4M-102HLEuROZPN9YZlpmKnkRo8b_SKA/exec';
    var CACHE_KEY_ABSEN = 'absensi_dukops_data';
    var CACHE_EXPIRY = 30 * 60 * 1000;
    var isOnlineAbsen = navigator.onLine;
    var currentDataAbsen = null;
    var tahunSelect = document.getElementById('absenTahunSelect');
    var bulanSelect = document.getElementById('absenBulanSelect');
    var resultContainer = document.getElementById('absenResultContainer');
    var screenshotArea = document.getElementById('absenScreenshotArea');

    if (tahunSelect) tahunSelect.onchange = onTahunChange;

    window.addEventListener('online', function() { isOnlineAbsen = true; loadAbsenTahun(); });
    window.addEventListener('offline', function() { isOnlineAbsen = false; });

    function loadAbsenTahun() {
        if (!tahunSelect) return;
        tahunSelect.disabled = true;
        tahunSelect.innerHTML = '<option>⏳ Mohon tunggu....</option>';
        var cached = getCacheAbsen();
        if (cached && cached.years && cached.years.length > 0) {
            populateTahunSelect(cached.years);
            tahunSelect.disabled = false;
        }
        if (!isOnlineAbsen) {
            if (!cached || !cached.years) tahunSelect.innerHTML = '<option>❌ Offline - no data</option>';
            return;
        }
        fetch(SCRIPT_URL + '?action=getYears').then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function(y) {
            if (y && y.length > 0) {
                populateTahunSelect(y);
                saveToCacheAbsen({ years: y, months: null, data: null });
            } else throw new Error('Tidak ada data');
        }).catch(function() {
            if (!cached || !cached.years) tahunSelect.innerHTML = '<option>❌ Gagal memuat</option>';
        }).finally(function() {
            if (tahunSelect) tahunSelect.disabled = false;
        });
    }

    function populateTahunSelect(y) {
        if (!tahunSelect) return;
        tahunSelect.innerHTML = '<option value="">-- Pilih Tahun --</option>';
        for (var i = 0; i < y.length; i++) {
            var o = document.createElement('option');
            o.value = y[i];
            o.textContent = y[i];
            tahunSelect.appendChild(o);
        }
        if (y.length > 0) { tahunSelect.value = y[0]; onTahunChange(); }
    }

    function onTahunChange() {
        if (!tahunSelect || !bulanSelect) return;
        var t = tahunSelect.value;
        if (!t) { bulanSelect.innerHTML = '<option>Pilih tahun dulu</option>'; bulanSelect.disabled = true; return; }
        bulanSelect.disabled = true;
        bulanSelect.innerHTML = '<option>⏳ Memuat...</option>';
        var c = getCacheAbsen();
        if (c && c.months && c.months[t]) {
            populateBulanSelect(c.months[t]);
            bulanSelect.disabled = false;
            return;
        }
        if (!isOnlineAbsen) {
            bulanSelect.innerHTML = '<option>❌ Offline</option>';
            bulanSelect.disabled = false;
            return;
        }
        fetch(SCRIPT_URL + '?action=getMonths&tahun=' + encodeURIComponent(t)).then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function(m) {
            if (m && m.length > 0) {
                populateBulanSelect(m);
                var uc = getCacheAbsen() || {};
                uc.months = uc.months || {};
                uc.months[t] = m;
                saveToCacheAbsen(uc);
            } else bulanSelect.innerHTML = '<option>Tidak ada data</option>';
            bulanSelect.disabled = false;
        }).catch(function() {
            bulanSelect.innerHTML = '<option>❌ Gagal memuat</option>';
            bulanSelect.disabled = false;
        });
    }

    function populateBulanSelect(m) {
        if (!bulanSelect) return;
        bulanSelect.innerHTML = '<option value="">-- Pilih Bulan --</option>';
        for (var i = 0; i < m.length; i++) {
            var o = document.createElement('option');
            o.value = m[i].num || m[i];
            o.textContent = m[i].name || m[i];
            bulanSelect.appendChild(o);
        }
        bulanSelect.onchange = function() {
            if (this.value) { loadDataAbsen(); } else { if (resultContainer) resultContainer.innerHTML = ''; }
        };
        if (bulanSelect.value) { loadDataAbsen(); }
    }

    function loadDataAbsen() {
        if (!tahunSelect || !bulanSelect) return;
        var t = tahunSelect.value, b = bulanSelect.value;
        if (!t || !b) { if (resultContainer) resultContainer.innerHTML = '<div class="absen-card">Pilih tahun dan bulan</div>'; return; }
        showLoadingAbsen();
        var c = getCacheAbsen(), ck = t + '_' + b;
        if (c && c.data && c.data[ck]) {
            var cd = c.data[ck];
            if (Date.now() - cd.timestamp < CACHE_EXPIRY) {
                displayDataAbsen(cd.data);
                currentDataAbsen = cd.data;
                return;
            }
        }
        if (!isOnlineAbsen) { showErrorAbsen('Tidak ada koneksi'); return; }
        fetch(SCRIPT_URL + '?action=getData&tahun=' + encodeURIComponent(t) + '&bulan=' + encodeURIComponent(b))
            .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function(d) {
                currentDataAbsen = d;
                displayDataAbsen(d);
                var uc = getCacheAbsen() || {};
                uc.data = uc.data || {};
                uc.data[ck] = { data: d, timestamp: Date.now() };
                saveToCacheAbsen(uc);
            }).catch(function(e) { showErrorAbsen('Gagal: ' + e.message); });
    }

    function displayDataAbsen(d) {
        if (!resultContainer) return;
        if (d.error) { showErrorAbsen(d.error); return; }
        var td = d.total_desa || 0, p = td > 0 ? Math.round((d.desa_lengkap / td) * 100) : 0, dh = '';
        for (var i = 0; i < d.details.length; i++) {
            var de = d.details[i], cls = '', txt = '', icon = '';
            if (de.status === 'LENGKAP') { cls = 'absen-status-lengkap'; icon = '✅'; txt = 'LENGKAP'; }
            else if (de.status === 'BELUM_LENGKAP') { cls = 'absen-status-belum-lengkap'; icon = '⚠️'; txt = 'BL'; }
            else { cls = 'absen-status-belum'; icon = '❌'; txt = 'BELUM'; }
            var w = (de.status === 'LENGKAP') ? '#4caf50' : ((de.status === 'BELUM_LENGKAP') ? '#ff9800' : '#f44336');
            dh += '<div class="absen-desa-item" onclick="window.showDetailAbsen(\'' + escapeHtml(de.nama) +
                '\',' + de.jumlah_file + ',' + de.persentase + ',\'' + de.status +
                '\')"><div class="absen-desa-name">' + icon + ' ' + escapeHtml(de.nama) +
                '</div><div class="absen-desa-stats">' + de.jumlah_file +
                '/9</div><div class="absen-desa-progress"><div class="absen-desa-progress-bar"><div class="absen-desa-progress-fill" style="width:' +
                de.persentase + '%;background:' + w +
                '"></div></div></div><div class="absen-status-badge ' + cls + '">' + txt + '</div></div>';
        }
        resultContainer.innerHTML =
            '<div class="absen-card"><div class="absen-stats-grid"><div class="absen-stat-card"><div class="absen-stat-value" style="color:#1a73e8;">' +
            d.total_desa +
            '</div><div class="absen-stat-label">DESA</div></div><div class="absen-stat-card"><div class="absen-stat-value" style="color:#4caf50;">' +
            d.desa_lengkap +
            '</div><div class="absen-stat-label">LENGKAP</div></div><div class="absen-stat-card"><div class="absen-stat-value" style="color:#ff9800;">' +
            d.desa_belum_lengkap +
            '</div><div class="absen-stat-label">BL</div></div><div class="absen-stat-card"><div class="absen-stat-value" style="color:#f44336;">' +
            d.desa_belum +
            '</div><div class="absen-stat-label">BELUM</div></div></div><div class="absen-progress-container"><div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:12px;"><span>📈 PROGRESS</span><span><b>' +
            p +
            '%</b></span></div><div class="absen-progress-bar"><div class="absen-progress-fill" style="width:' +
            p +
            '%"></div></div></div><div style="font-size:0.7rem;font-weight:600;margin:10px 0 5px;">📋 DAFTAR DESA (' +
            d.total_desa +
            ')</div><div class="absen-desa-list">' + dh +
            '</div></div>';
    }

    function getCacheAbsen() {
        try { var c = localStorage.getItem(CACHE_KEY_ABSEN); if (c) return JSON.parse(c); } catch (e) {}
        return null;
    }

    function saveToCacheAbsen(d) {
        try { localStorage.setItem(CACHE_KEY_ABSEN, JSON.stringify(d)); } catch (e) {}
    }

    function showLoadingAbsen() {
        if (resultContainer) resultContainer.innerHTML =
            '<div class="absen-loading"><div class="absen-spinner"></div><p>Mohon Tunggu ...</p></div>';
    }

    function showErrorAbsen(m) {
        if (resultContainer) resultContainer.innerHTML =
            '<div class="absen-card" style="color:#f44336;">⚠️ ' + escapeHtml(m) + '</div>';
    }

    function escapeHtml(t) {
        if (!t) return '';
        return t.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    window.showDetailAbsen = function(n, j, p, s) {
        alert((s === 'LENGKAP' ? '✅ ' : (s === 'BELUM_LENGKAP' ? '⚠️ ' : '❌ ')) + n + '\n' + j + '/9 (' + p + '%)');
    };

    window.shareAsPNGAbsen = async function() {
        var btn = document.getElementById('downloadAbsenBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MEMBUAT PNG...'; }

        if (!currentDataAbsen) {
            alert('⚠️ Belum ada data absensi. Silakan pilih Tahun dan Bulan terlebih dahulu.');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD ABSEN PNG'; }
            return;
        }

        if (typeof html2canvas === 'undefined') {
            alert('❌ Library html2canvas tidak ditemukan. Silakan refresh halaman.');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD ABSEN PNG'; }
            return;
        }

        var screenshotArea = document.getElementById('absenScreenshotArea');
        if (!screenshotArea) {
            alert('❌ Elemen screenshot tidak ditemukan.');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD ABSEN PNG'; }
            return;
        }

        try {
            var d = currentDataAbsen;
            var totalDesa = d.total_desa || 0;
            var desaLengkap = d.desa_lengkap || 0;
            var persentase = totalDesa > 0 ? Math.round((desaLengkap / totalDesa) * 100) : 0;
            var tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            var bulanTahun = d.nama_bulan || '';
            var tahun = d.tahun || '';
            if (!bulanTahun) {
                var bulanSelect = document.getElementById('absenBulanSelect');
                if (bulanSelect && bulanSelect.value) {
                    var bulanText = bulanSelect.options[bulanSelect.selectedIndex]?.text || '';
                    var tahunSelect = document.getElementById('absenTahunSelect');
                    var tahunText = tahunSelect ? tahunSelect.value : '';
                    bulanTahun = bulanText + ' ' + tahunText;
                }
            }

            var lh = '';
            if (d.details && d.details.length > 0) {
                for (var i = 0; i < d.details.length; i++) {
                    var de = d.details[i];
                    var w = (de.status === 'LENGKAP') ? '#4caf50' : ((de.status === 'BELUM_LENGKAP') ? '#ff9800' : '#f44336');
                    var em = (de.status === 'LENGKAP') ? '✅' : ((de.status === 'BELUM_LENGKAP') ? '⚠️' : '❌');
                    var st = (de.status === 'LENGKAP') ? 'LENGKAP' : ((de.status === 'BELUM_LENGKAP') ? 'BL' : 'BELUM');
                    var sb = (de.status === 'LENGKAP') ? '#e8f5e9' : ((de.status === 'BELUM_LENGKAP') ? '#fff3e0' : '#ffebee');
                    lh += `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;">
                        <div style="width:24px;font-size:14px;text-align:center;">${em}</div>
                        <div style="flex:2;font-size:12px;font-weight:500;color:#000;">${escapeHtml(de.nama || '')}</div>
                        <div style="width:40px;font-size:11px;text-align:center;color:#000;">${de.jumlah_file || 0}/9</div>
                        <div style="width:60px;"><div style="background:#e0e0e0;border-radius:6px;height:6px;overflow:hidden;">
                            <div style="background:${w};width:${de.persentase || 0}%;height:6px;border-radius:6px;"></div>
                        </div></div>
                        <div style="width:50px;font-size:9px;text-align:center;padding:2px 6px;border-radius:8px;background:${sb};color:${w};font-weight:600;">${st}</div>
                    </div>`;
                }
            } else {
                lh = '<div style="text-align:center;padding:20px;color:#999;">Tidak ada data desa</div>';
            }

            screenshotArea.innerHTML = `
                <div style="max-width:600px;margin:0 auto;padding:20px;background:#ffffff;border-radius:12px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1a2332;border-radius:10px 10px 0 0;color:white;">
                        <div style="font-size:16px;font-weight:700;">📊 ABSENSI DUKOPS</div>
                        <div style="font-size:8px;opacity:0.7;">Koramil Monitoring</div>
                    </div>
                    <div style="padding:16px;">
                        <div style="text-align:center;margin-bottom:12px;">
                            <div style="font-size:16px;font-weight:700;color:#000;">${bulanTahun || 'Data Absensi'}</div>
                            <div style="font-size:10px;color:#666;">${tanggal}</div>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0;">
                            <div style="background:#f8f9fa;border-radius:8px;padding:10px 4px;text-align:center;border:1px solid #e9ecef;">
                                <div style="font-size:14px;font-weight:700;color:#1a73e8;">${totalDesa}</div>
                                <div style="font-size:8px;color:#6b7a8f;text-transform:uppercase;">DESA</div>
                            </div>
                            <div style="background:#f8f9fa;border-radius:8px;padding:10px 4px;text-align:center;border:1px solid #e9ecef;">
                                <div style="font-size:14px;font-weight:700;color:#4caf50;">${desaLengkap}</div>
                                <div style="font-size:8px;color:#6b7a8f;text-transform:uppercase;">LENGKAP</div>
                            </div>
                            <div style="background:#f8f9fa;border-radius:8px;padding:10px 4px;text-align:center;border:1px solid #e9ecef;">
                                <div style="font-size:14px;font-weight:700;color:#ff9800;">${d.desa_belum_lengkap || 0}</div>
                                <div style="font-size:8px;color:#6b7a8f;text-transform:uppercase;">BL</div>
                            </div>
                            <div style="background:#f8f9fa;border-radius:8px;padding:10px 4px;text-align:center;border:1px solid #e9ecef;">
                                <div style="font-size:14px;font-weight:700;color:#f44336;">${d.desa_belum || 0}</div>
                                <div style="font-size:8px;color:#6b7a8f;text-transform:uppercase;">BELUM</div>
                            </div>
                        </div>
                        <div style="margin:12px 0;">
                            <div style="display:flex;justify-content:space-between;font-size:10px;color:#000;">
                                <span>📈 PROGRESS</span>
                                <span><b>${persentase}%</b></span>
                            </div>
                            <div style="background:#e9ecef;border-radius:6px;height:8px;overflow:hidden;">
                                <div style="background:linear-gradient(90deg,#4CAF50,#66BB6A);width:${persentase}%;height:8px;border-radius:6px;"></div>
                            </div>
                        </div>
                        <div style="font-size:11px;font-weight:600;margin:12px 0 6px 0;color:#000;">📋 DAFTAR DESA (${totalDesa})</div>
                        <div style="max-height:400px;overflow:hidden;">${lh}</div>
                    </div>
                    <div style="text-align:center;padding:8px 0 4px 0;font-size:8px;color:#999;border-top:1px solid #f0f2f5;margin-top:8px;">
                        DUKOPS • Koramil Monitoring
                    </div>
                </div>
            `;

            await new Promise(resolve => setTimeout(resolve, 300));

            var el = screenshotArea.firstChild;
            if (!el) throw new Error('Konten screenshot tidak ditemukan');

            var canvas = await html2canvas(el, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false,
                allowTaint: true,
                width: 600
            });

            var link = document.createElement('a');
            var fileName = 'Absensi_' + (bulanTahun || 'data') + '_' + new Date().toISOString().slice(0,10) + '.png';
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('✅ Download PNG berhasil:', fileName);

        } catch (e) {
            console.error('❌ Gagal screenshot:', e);
            alert('❌ Gagal membuat gambar: ' + e.message);
        }

        setTimeout(function() {
            var sa = document.getElementById('absenScreenshotArea');
            if (sa) sa.innerHTML = '';
        }, 500);

        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD ABSEN PNG'; }
    };

    window.loadAbsenTahun = loadAbsenTahun;
})();

// ================= SERVICE WORKER =================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        console.log('🔧 Registering Service Worker...');
        navigator.serviceWorker.register('/dukops4/sw.js')
            .then(function(registration) {
                console.log('✅ Service Worker registered successfully!');
                console.log('📦 Scope:', registration.scope);
                if (registration.active) console.log('✅ Service Worker is active!');
            })
            .catch(function(error) {
                console.log('❌ Service Worker registration failed:', error);
            });
    });
} else {
    console.log('⚠️ Service Worker not supported in this browser.');
}