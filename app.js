// ================= KONFIGURASI AMAN =================
const GOOGLE_APPS_SCRIPT_WEBHOOK = "https://script.google.com/macros/s/AKfycbz3sB1d0PRRzlvAJwdr8nl5dQa6qpyfHQCJbYxBMz0Jpj2o-i1_WnwMzJEy3Z4GA9uh/exec";
const TARGET_LAPORAN = 9;

// KONFIGURASI JADWAL PIKET
const GITHUB_URLS = {
    HANPANGAN: "data/hanpangan.txt",
    PIKET: "data/piket.txt"
};

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

// Variabel untuk Jadwal Piket
let JadwalData = {
    daftarNama: [],
    daftarHanpangan: [],
    currentHanpangan: ""
};

// Variabel status aplikasi
let currentApp = null;
let isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ================= SPLASH SCREEN =================
document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 DOM Content Loaded");
    console.log("📱 Device Type:", isMobileDevice ? "MOBILE" : "DESKTOP");

    const splashScreen = document.getElementById('splashScreen');
    const appContainer = document.getElementById('appContainer');
    const progressBar = document.getElementById('splashProgressBar');
    const progressText = document.getElementById('progressPercentage');

    if (!splashScreen) {
        console.error("❌ Splash screen element not found!");
        return;
    }

    let progress = 0;
    let isAppOpened = false;

    function updateProgress(value, message) {
        progress = Math.min(value, 100);
        if (progressBar) progressBar.style.width = progress + '%';
        if (progressText) progressText.textContent = Math.round(progress) + '%';
        console.log(`Progress: ${progress}% - ${message}`);

        if (progress >= 75 && progress < 98) {
            const transitionProgress = (progress - 75) / (98 - 75);
            if (splashScreen) splashScreen.style.opacity = 1 - transitionProgress;
            if (appContainer) {
                appContainer.style.opacity = transitionProgress;
                appContainer.style.display = 'block';
            }
        }

        if (progress >= 98) {
            if (splashScreen) {
                splashScreen.style.opacity = 0;
                splashScreen.style.pointerEvents = 'none';
            }
            if (appContainer) {
                appContainer.style.opacity = 1;
                appContainer.style.display = 'block';
            }
        }

        if (progress >= 100 && !isAppOpened) {
            isAppOpened = true;
            console.log("✅ Progress 100% - Opening app...");
            setTimeout(() => {
                if (splashScreen) splashScreen.style.display = 'none';
                loadDukopsApp();
            }, 200);
        }
    }

    const loadingStages = [
        { percent: 33, message: "Memuat sistem..." },
        { percent: 66, message: "Menyiapkan aplikasi..." },
        { percent: 100, message: "Aplikasi Siap digunakan" }
    ];

    let currentStage = 0;
    const stageDelay = isMobileDevice ? 400 : 800;

    function loadNextStage() {
        if (currentStage >= loadingStages.length) return;
        const stage = loadingStages[currentStage];
        updateProgress(stage.percent, stage.message);
        currentStage++;
        setTimeout(loadNextStage, stageDelay);
    }

    loadNextStage();

    const emergencyTimeout = isMobileDevice ? 3000 : 6000;
    setTimeout(() => {
        if (!isAppOpened) {
            console.warn("⚠️ Emergency timeout triggered");
            isAppOpened = true;
            updateProgress(100, "Aplikasi Siap digunakan");
            setTimeout(() => {
                if (splashScreen) {
                    splashScreen.style.display = 'none';
                    splashScreen.style.opacity = 0;
                }
                if (appContainer) {
                    appContainer.style.display = 'block';
                    appContainer.style.opacity = 1;
                }
                loadDukopsApp();
            }, 100);
        }
    }, emergencyTimeout);
});

// ================= FUNGSI NAVIGASI =================
function loadDukopsApp() {
    currentApp = 'dukops';
    showApp();
    initializeApp();
}

function showApp() {
    const splashScreen = document.getElementById('splashScreen');
    const appContainer = document.getElementById('appContainer');

    splashScreen.style.opacity = '0';
    splashScreen.style.transition = 'opacity 0.8s ease';

    setTimeout(() => {
        splashScreen.style.display = 'none';
        appContainer.style.display = 'block';
        setTimeout(() => {
            appContainer.style.opacity = '1';
            if (currentApp === 'dukops') {
                document.getElementById('btnDukops').classList.add('active');
                document.getElementById('btnJadwal').classList.remove('active');
                document.getElementById('dukopsContent').style.display = 'block';
                document.getElementById('jadwalPiketContainerBaru').style.display = 'none';
                document.getElementById('absenContent').style.display = 'none';
                document.getElementById('hanpanganContent').style.display = 'none';
            } else {
                document.getElementById('btnDukops').classList.remove('active');
                document.getElementById('btnJadwal').classList.add('active');
                document.getElementById('dukopsContent').style.display = 'none';
                document.getElementById('jadwalPiketContainerBaru').style.display = 'block';
                document.getElementById('absenContent').style.display = 'none';
                document.getElementById('hanpanganContent').style.display = 'none';
            }
            console.log(`🎉 ${currentApp.toUpperCase()} App initialized!`);
        }, 100);
    }, 800);
}

// ================= NAVIGASI TAB =================
window.showDukops = function() {
    document.getElementById('dukopsContent').style.display = 'block';
    document.getElementById('jadwalPiketContainerBaru').style.display = 'none';
    document.getElementById('absenContent').style.display = 'none';
    document.getElementById('hanpanganContent').style.display = 'none';
    document.getElementById('btnDukops').classList.add('active');
    document.getElementById('btnJadwal').classList.remove('active');
    document.getElementById('btnAbsen').classList.remove('active');
    document.getElementById('btnHanpangan').classList.remove('active');
    currentApp = 'dukops';
    if (typeof window.triggerPlayMusic === 'function') window.triggerPlayMusic();
};

window.showJadwalPiket = function() {
    document.getElementById('dukopsContent').style.display = 'none';
    document.getElementById('jadwalPiketContainerBaru').style.display = 'block';
    document.getElementById('absenContent').style.display = 'none';
    document.getElementById('hanpanganContent').style.display = 'none';
    document.getElementById('btnDukops').classList.remove('active');
    document.getElementById('btnJadwal').classList.add('active');
    document.getElementById('btnAbsen').classList.remove('active');
    document.getElementById('btnHanpangan').classList.remove('active');
    currentApp = 'jadwal';
    if (JadwalData.daftarNama.length === 0) {
        initJadwalPiket();
    }
    if (typeof window.triggerPlayMusic === 'function') window.triggerPlayMusic();
};

window.showAbsenTab = function() {
    document.getElementById('dukopsContent').style.display = 'none';
    document.getElementById('jadwalPiketContainerBaru').style.display = 'none';
    document.getElementById('absenContent').style.display = 'block';
    document.getElementById('hanpanganContent').style.display = 'none';
    document.getElementById('btnDukops').classList.remove('active');
    document.getElementById('btnJadwal').classList.remove('active');
    document.getElementById('btnAbsen').classList.add('active');
    document.getElementById('btnHanpangan').classList.remove('active');
    if (typeof loadAbsenTahun === 'function') loadAbsenTahun();
    if (typeof window.triggerPlayMusic === 'function') window.triggerPlayMusic();
};

window.showHanpangan = function() {
    document.getElementById('dukopsContent').style.display = 'none';
    document.getElementById('jadwalPiketContainerBaru').style.display = 'none';
    document.getElementById('absenContent').style.display = 'none';
    document.getElementById('hanpanganContent').style.display = 'block';
    document.getElementById('btnDukops').classList.remove('active');
    document.getElementById('btnJadwal').classList.remove('active');
    document.getElementById('btnAbsen').classList.remove('active');
    document.getElementById('btnHanpangan').classList.add('active');
    if (typeof window.triggerPlayMusic === 'function') window.triggerPlayMusic();
};

// ================= FUNGSI BACKEND =================
async function sendToBackend(action, data = {}) {
    try {
        if (action === 'listFiles' || action === 'getConfig' || action === 'test' || action === 'telegramTest' || action === 'getJadwalData') {
            let url = `${GOOGLE_APPS_SCRIPT_WEBHOOK}?action=${action}`;
            if (action === 'listFiles') {
                if (data.desaFilter) url += `&desaFilter=${encodeURIComponent(data.desaFilter)}`;
                if (data.monthFilter) url += `&monthFilter=${encodeURIComponent(data.monthFilter)}`;
                if (data.readZips) url += `&readZips=true`;
            } else if (action === 'getJadwalData') {
                if (data.type) url += `&type=${encodeURIComponent(data.type)}`;
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
            const installButton = document.getElementById('installButton');
            if (installButton) {
                installButton.style.display = 'flex';
                installButton.addEventListener('click', async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                            installButton.style.display = 'none';
                            showNotification('✅ Aplikasi berhasil diinstall!', 'success');
                        }
                        deferredPrompt = null;
                    }
                });
            }
        }, 3000);
    });
    window.addEventListener('appinstalled', () => {
        const installButton = document.getElementById('installButton');
        if (installButton) installButton.style.display = 'none';
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
    console.log("🔄 Loading desa list...");
    const select = document.getElementById('selectDesa');
    const loading = document.getElementById('loadingDesa');
    if (!select) return;
    loading.style.display = 'block';

    try {
        const fallbackDesas = [
            "Gitgit", "Panji", "Panji Anom", "Sukasada", "Pancasari", "Wanagiri",
            "Ambengan", "Kayu Putih", "Padang Bulia", "Pegadungan",
            "Pegayaman", "Sambangan", "Selat", "Silangjana", "Tegallinggah"
        ];

        select.innerHTML = '<option value="">-- Pilih Desa --</option>';
        for (const desaName of fallbackDesas) {
            const option = document.createElement('option');
            const jsonPath = `data/coordinates/${desaName}.json`;
            option.value = jsonPath;
            option.textContent = normalizeDesaName(desaName).cleanName;
            option.setAttribute('data-raw-name', desaName);
            select.appendChild(option);
        }
        console.log(`✅ Loaded ${fallbackDesas.length} desas from lokal`);
        showNotification('✅ Daftar desa berhasil dimuat', 'success');
    } catch (error) {
        console.error("❌ Error loading desa list:", error);
        showNotification('⚠️ Gagal memuat daftar desa', 'warning');
    } finally {
        loading.style.display = 'none';
    }
}

function normalizeDesaName(desaName) {
    if (!desaName) return { original: "", normalized: "", forTelegram: "", cleanName: "" };
    let normalized = desaName;
    normalized = normalized.replace(/^Desa\s+/i, '');
    normalized = normalized.replace(/^Kelurahan\s+/i, '');
    normalized = normalized.replace(/Kel\.\s*/gi, '');
    normalized = normalized.replace(/Kel\s/gi, '');
    normalized = normalized.trim();
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

    if (!jsonPath) {
        resetForm();
        return;
    }

    const selectedOption = select.options[select.selectedIndex];
    selectedDesa = selectedOption.getAttribute('data-raw-name') || selectedOption.text;

    updateDesaHeaderImage(selectedDesa);
    updateAttendanceButtonState();
    updateAttendanceSelectedDesaLabel();

    if (document.getElementById('attendancePanel')?.style.display === 'block') {
        loadAttendanceData();
    }

    const desaInfo = normalizeDesaName(selectedDesa);
    const previewDesa = document.getElementById('previewDesa');
    previewDesa.textContent = desaInfo.cleanName;
    previewDesa.style.display = 'block';

    const fotoLabel = document.getElementById('labelFotoKegiatan');
    if (fotoLabel) {
        fotoLabel.innerHTML = `<i class="fas fa-camera"></i> Foto Kegiatan: ${desaInfo.cleanName}`;
    }

    if (typeof window.triggerPlayMusic === 'function') {
        window.triggerPlayMusic();
    }

    loading.style.display = 'block';
    document.getElementById('previewKordinat').textContent = "Memuat koordinat...";

    try {
        console.log(`📂 Fetching coordinates from: ${jsonPath}`);
        const response = await fetch(jsonPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const jsonData = await response.json();
        console.log(`✅ JSON parsed successfully`);

        if (!jsonData.coordinates || !Array.isArray(jsonData.coordinates)) {
            throw new Error("Format JSON koordinat tidak valid");
        }

        kordinatList = jsonData.coordinates.map(coord =>
            `${coord.lat},${coord.lon},${coord.elevation}`
        );

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
        setTimeout(() => {
            coordElement.style.opacity = "1";
        }, 50);
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
                if (kordinatList.length > 0) {
                    pickRandomKoordinat();
                }
                preview.textContent = file.name;
                updatePreview();
            };
            img.onerror = function() {
                showNotification("Gagal memuat gambar", "error");
                document.getElementById("gambar").value = "";
                preview.textContent = "";
            };
        };
        reader.onerror = function() {
            showNotification("Gagal membaca file", "error");
        };
        reader.readAsDataURL(file);
    } else {
        img = new Image();
        updatePreview();
    }
    checkInputCompletion();
}

function updateDatePreview() {
    const tglInput = document.getElementById("tanggalWaktu").value;
    const tanggalLabelText = document.getElementById('tanggalWaktuLabelText');

    if (tglInput) {
        let date = new Date(tglInput);
        date.setSeconds(Math.floor(Math.random() * 60));
        tanggalWaktu = date.toISOString();

        const options = {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };

        const displayText = date.toLocaleString('id-ID', options).replace(/:/g, '.');
        if (tanggalLabelText) {
            tanggalLabelText.textContent = displayText;
        }
    } else {
        tanggalWaktu = "";
        if (tanggalLabelText) {
            tanggalLabelText.textContent = 'Pilih tanggal & waktu';
        }
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
            ctx.fillText(watermarkText,
                canvas.width - rightMargin,
                canvas.height - bottomMargin - (lineHeight * 2));
        }

        if (currentKoordinat) {
            ctx.fillStyle = "white";
            ctx.fillText(currentKoordinat,
                canvas.width - rightMargin,
                canvas.height - bottomMargin - lineHeight);
        }

        if (tanggalWaktu) {
            const date = new Date(tanggalWaktu);
            let dateText = date.toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }) + ", " + date.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });

            ctx.fillStyle = "white";
            ctx.fillText(dateText,
                canvas.width - rightMargin,
                canvas.height - bottomMargin);
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

        // 1. Download ke lokal
        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = zipFileNameForDownload;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // 2. Kirim ke Telegram
        await sendZipToTelegram(content, zipFileNameForBackend, selectedDesa);

        // 3. Upload ke Google Drive
        const driveUploaded = await uploadToGoogleDrive(content, zipFileNameForBackend, selectedDesa, date);

        // 4. Update counter per desa
        const desaData = updateDesaCounter(selectedDesa, zipFileNameForBackend);

        // 5. Refresh data absensi
        if (document.getElementById('attendancePanel').style.display === 'block') {
            setTimeout(() => loadAttendanceData(), 2000);
        }

        // 6. Notifikasi hasil
        if (driveUploaded) {
            showNotification(`✔ Laporan berhasil disimpan (${desaData.count}/${TARGET_LAPORAN} laporan)`, "success");
        } else {
            showNotification(`⚠ Laporan hanya didownload, gagal simpan ke Drive`, "warning");
        }

        // Cek jika sudah mencapai 9 laporan
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
    if (!selectedDesa) {
        showNotification("Masukkan nama desa terlebih dahulu", "warning");
        return false;
    }
    if (!currentKoordinat) {
        showNotification("Koordinat tidak valid", "warning");
        return false;
    }
    if (!tanggalWaktu) {
        showNotification("Isi tanggal dan waktu", "warning");
        return false;
    }
    if (!img.src || !img.complete) {
        showNotification("Upload foto kegiatan", "warning");
        return false;
    }
    const narasi = document.getElementById("narasi").value.trim();
    if (!narasi) {
        showNotification("Isi narasi kegiatan", "warning");
        return false;
    }

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
    const tanggalLabelText = document.getElementById('tanggalWaktuLabelText');
    if (tanggalLabelText) tanggalLabelText.textContent = 'Pilih tanggal & waktu';
    document.getElementById('previewGambar').textContent = "";
    updateDesaHeaderImage("");
    checkInputCompletion();
    updatePreview();
    resetCanvas();
}

function loadDesaCounter() {
    const savedCounter = localStorage.getItem('dukopsDesaCounter');
    desaCounter = savedCounter ? JSON.parse(savedCounter) : {};
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
    const savedDates = localStorage.getItem('dukopsSubmittedDates');
    submittedDates = savedDates ? JSON.parse(savedDates) : [];
}

function checkInputCompletion() {
    const isComplete = selectedDesa &&
        currentKoordinat &&
        tanggalWaktu &&
        img.src &&
        img.complete &&
        document.getElementById("narasi").value.trim();

    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
        submitBtn.disabled = !isComplete;
    }
    updateAttendanceButtonState();
}

function updateAttendanceButtonState() {
    const button = document.getElementById('showAttendanceBtn');
    if (!button) return;
    button.disabled = !selectedDesa;
}

function updateAttendanceSelectedDesaLabel() {
    const label = document.getElementById('attendanceSelectedDesaName');
    if (!label) return;
    label.textContent = selectedDesa ? normalizeDesaName(selectedDesa).cleanName : 'Silahkan Pilih Desa';
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

document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.getElementById('narasi');
    if (textarea) {
        textarea.addEventListener('input', () => autoResizeNarasi(textarea));
        autoResizeNarasi(textarea);
    }
});

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
            loadAttendanceFromFallback();
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        loadAttendanceFromFallback();
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

function loadAttendanceFromFallback() {
    const list = document.getElementById('attendanceList');
    const summary = document.getElementById('attendanceSummary');
    if (!list) return;

    const desaData = [];
    for (const [desaName, data] of Object.entries(desaCounter)) {
        if (data.files && data.files.length > 0) {
            data.files.forEach(fileName => {
                desaData.push({
                    name: fileName,
                    desa: desaName,
                    count: data.count,
                    month: data.month
                });
            });
        }
    }

    if (desaData.length > 0) {
        attendanceData = desaData.map(item => ({
            name: item.name,
            desa: item.desa,
            size: 0,
            createdTime: new Date().toISOString(),
            webViewLink: '#',
            zipContents: `Narasi.txt, Dukops.png`,
            month: extractMonthYearFromFileName(item.name)
        }));
        displayAttendanceList(attendanceData);
        displayAttendanceSummary(attendanceData);
        showNotification("Menggunakan data lokal (offline mode)", "warning");
    } else {
        list.innerHTML = `<div style="text-align: center; color: #a5a5a5; padding: 20px;">
            <i class="fas fa-folder-open"></i><br>
            Tidak ada data laporan<br>
            <small>Silakan kirim laporan terlebih dahulu</small>
        </div>`;
        if (summary) summary.style.display = 'none';
    }
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

    const groupedByMonthYear = {};
    files.forEach(file => {
        const monthYear = file.month || extractMonthYearFromFileName(file.name);
        if (!groupedByMonthYear[monthYear]) {
            groupedByMonthYear[monthYear] = { month: monthYear, files: [], desas: new Set() };
        }
        groupedByMonthYear[monthYear].files.push(file);
        const desaName = file.desa || extractDesaFromFileName(file.name);
        groupedByMonthYear[monthYear].desas.add(desaName);
    });

    const sortedMonths = Object.keys(groupedByMonthYear).sort((a, b) => new Date(b) - new Date(a));

    let html = '';
    sortedMonths.forEach(monthYear => {
        const group = groupedByMonthYear[monthYear];
        const [year, month] = monthYear.split('-');
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const monthName = monthNames[parseInt(month) - 1];

        html += `
            <div class="desa-card" style="margin-bottom: 20px;">
                <div class="desa-header" style="background: #cc5500;">
                    <div class="desa-name"><i class="fas fa-folder"></i> ${monthName} ${year}</div>
                    <div class="desa-count">${group.files.length} laporan | ${group.desas.size} desa</div>
                </div>
                <div class="desa-files">
        `;

        const filesByDesa = {};
        group.files.forEach(file => {
            const desaName = file.desa || extractDesaFromFileName(file.name);
            if (!filesByDesa[desaName]) filesByDesa[desaName] = [];
            filesByDesa[desaName].push(file);
        });

        Object.entries(filesByDesa).forEach(([desaName, desaFiles]) => {
            const fileCount = desaFiles.length;
            const isComplete = fileCount >= TARGET_LAPORAN;

            html += `
                <div class="desa-card" style="margin: 10px 0; border-left: 4px solid ${isComplete ? '#4CAF50' : '#FF9800'};">
                    <div class="desa-header" style="padding: 8px 12px;">
                        <div class="desa-name" style="font-size: 14px;">${desaName}</div>
                        <div class="desa-count" style="font-size: 12px; color: ${isComplete ? '#4CAF50' : '#FF9800'}">
                            ${fileCount}/9 laporan
                        </div>
                    </div>
                    <div class="desa-files" style="padding: 5px 12px;">
            `;

            desaFiles.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));

            desaFiles.forEach((file, index) => {
                const date = new Date(file.createdTime);
                const dateStr = date.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const fileSize = file.size ? formatFileSize(file.size) : 'Ukuran tidak tersedia';
                const zipContents = file.zipContents ? `** Isi ZIP: ${file.zipContents}` : '';
                const displayIndex = desaFiles.length - index;

                html += `
                    <div class="file-item" style="padding: 6px 0;">
                        <div class="file-info">
                            <div style="flex: 1;">
                                <div class="file-name" style="font-size: 13px;">${displayIndex}. ${file.name}</div>
                                <div class="file-meta">** ${dateStr} ** ${fileSize}</div>
                                ${zipContents ? `<div class="file-zip">** ${zipContents}</div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
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
        const desaName = file.desa || extractDesaFromFileName(file.name);
        uniqueDesas.add(desaName);
    });
    if (totalDesa) totalDesa.textContent = uniqueDesas.size;

    let totalAchieved = 0;
    let totalPossible = uniqueDesas.size * TARGET_LAPORAN;

    const desaCounts = {};
    files.forEach(file => {
        const desaName = file.desa || extractDesaFromFileName(file.name);
        desaCounts[desaName] = (desaCounts[desaName] || 0) + 1;
    });

    Object.values(desaCounts).forEach(count => {
        totalAchieved += Math.min(count, TARGET_LAPORAN);
    });

    const achievementPercent = totalPossible > 0 ? (totalAchieved / totalPossible * 100) : 0;

    if (targetStatus) {
        targetStatus.textContent = `${achievementPercent.toFixed(1)}%`;
        targetStatus.style.color = achievementPercent >= 100 ? '#4CAF50' :
            achievementPercent >= 70 ? '#FF9800' : '#f44336';
    }
}

function extractDesaFromFileName(filename) {
    const cleanName = filename.replace(/_/g, ' ')
        .replace(/\.zip$/, '')
        .replace(/\s+\d{1,2}\s+\d{4}$/, '')
        .trim();

    const selectDesa = document.getElementById('selectDesa');
    if (!selectDesa) return cleanName;

    for (let i = 1; i < selectDesa.options.length; i++) {
        const option = selectDesa.options[i];
        const desaInfo = normalizeDesaName(option.getAttribute('data-raw-name') || option.text);
        if (cleanName.toLowerCase().includes(desaInfo.cleanName.toLowerCase()) ||
            desaInfo.cleanName.toLowerCase().includes(cleanName.toLowerCase())) {
            return desaInfo.cleanName;
        }
    }
    return cleanName;
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function refreshAttendanceData() {
    loadAttendanceData();
}

// ================= POPUP UCAPAN TERIMA KASIH =================
function showThankYouPopup(desaName, count) {
    const modal = document.createElement('div');
    modal.className = 'thankyou-popup';
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.85);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s;
    `;

    modal.innerHTML = `
        <div style="
            background: linear-gradient(145deg, #1a3a1a, #0a1a0a);
            border: 2px solid #4CAF50;
            border-radius: 20px;
            padding: 40px;
            max-width: 450px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);
        ">
            <div style="font-size: 80px; color: #4CAF50; margin-bottom: 20px;">
                <i class="fas fa-trophy"></i>
            </div>
            <h2 style="color: #9fd49f; margin-bottom: 15px; font-size: 28px;">🎉 SELAMAT! 🎉</h2>
            <p style="color: #f5f5f5; font-size: 18px; line-height: 1.5; margin-bottom: 20px;">
                <strong>Babinsa ${desaName}</strong><br>
                Telah menyelesaikan <strong>${count} laporan</strong> untuk bulan ini!
            </p>
            <div style="
                background: rgba(76, 175, 80, 0.2);
                border: 2px solid #4CAF50;
                border-radius: 10px;
                padding: 15px;
                margin: 20px 0;
                font-size: 16px;
                color: #b2d8b2;
            ">
                <i class="fas fa-check-circle"></i> Target 9 laporan per bulan TERCAPAI!
            </div>
            <button onclick="this.closest('.thankyou-popup').remove()" 
                    style="
                        background: linear-gradient(135deg, #4CAF50, #2b4d2b);
                        color: white;
                        border: none;
                        padding: 12px 25px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        width: 100%;
                    ">
                <i class="fas fa-thumbs-up"></i> TERIMA KASIH
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
        if (modal.parentNode) modal.remove();
    }, 10000);
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

// ================= FUNGSI JADWAL PIKET =================
async function initJadwalPiket() {
    try {
        await loadJadwalPiketFromGitHub();
        await loadJadwalHanpanganFromGitHub();
        setupJadwalDropdowns();
        loadJadwalSelections();

        const jadwalDropdownIds = [
            'j_nama1a_baru', 'j_nama1b_baru', 'j_nama2a_baru', 'j_nama2b_baru',
            'j_nama3a_baru', 'j_nama3b_baru', 'j_nama3c_baru', 'j_nama3d_baru',
            'j_nama4a_baru', 'j_nama4b_baru', 'j_nama4c_baru', 'j_nama4d_baru'
        ];

        jadwalDropdownIds.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.addEventListener('change', updateJadwalPreview);
            }
        });

        updateJadwalPreview();
    } catch (error) {
        console.error("Error in jadwal piket initialization:", error);
    }
}

async function loadJadwalPiketFromGitHub() {
    try {
        const response = await fetch(GITHUB_URLS.PIKET + '?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Gagal mengambil data dari GitHub');
        const data = await response.text();
        JadwalData.daftarNama = data.trim().split('\n')
            .filter(line => line.trim() !== "")
            .map(nama => nama.trim());
        console.log("Data piket dimuat:", JadwalData.daftarNama.length, "nama");
        return true;
    } catch (error) {
        console.error("Error loading piket data:", error);
        return false;
    }
}

async function loadJadwalHanpanganFromGitHub() {
    try {
        const response = await fetch(GITHUB_URLS.HANPANGAN + '?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Gagal mengambil data');
        const data = await response.text();
        const lines = data.trim().split('\n').filter(line => line.trim() !== "");
        if (lines.length > 0) {
            JadwalData.daftarHanpangan = lines;
            const today = new Date();
            const dayOfMonth = today.getDate();
            JadwalData.currentHanpangan = lines[(dayOfMonth - 1) % lines.length];
            document.getElementById('runningTextJadwalBaru').textContent = '🌾 JADWAL HANPANGAN HARI INI: ' + JadwalData.currentHanpangan + ' 🌾';
        }
        return true;
    } catch (error) {
        console.error("Error loading hanpangan data:", error);
        return false;
    }
}

function setupJadwalDropdowns() {
    const jadwalDropdownIds = [
        'j_nama1a_baru', 'j_nama1b_baru', 'j_nama2a_baru', 'j_nama2b_baru',
        'j_nama3a_baru', 'j_nama3b_baru', 'j_nama3c_baru', 'j_nama3d_baru',
        'j_nama4a_baru', 'j_nama4b_baru', 'j_nama4c_baru', 'j_nama4d_baru'
    ];

    jadwalDropdownIds.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        while (select.options.length > 1) select.remove(1);
        JadwalData.daftarNama.forEach(nama => {
            const option = document.createElement('option');
            option.value = nama;
            option.textContent = nama;
            select.appendChild(option);
        });
        select.selectedIndex = 0;
    });
}

function loadJadwalSelections() {
    try {
        const savedSelections = localStorage.getItem('jadwalSelections');
        if (savedSelections) {
            const selections = JSON.parse(savedSelections);
            const jadwalDropdownIds = [
                'j_nama1a_baru', 'j_nama1b_baru', 'j_nama2a_baru', 'j_nama2b_baru',
                'j_nama3a_baru', 'j_nama3b_baru', 'j_nama3c_baru', 'j_nama3d_baru',
                'j_nama4a_baru', 'j_nama4b_baru', 'j_nama4c_baru', 'j_nama4d_baru'
            ];
            jadwalDropdownIds.forEach(id => {
                const select = document.getElementById(id);
                if (select && selections[id]) {
                    select.value = selections[id];
                }
            });
        }
    } catch (e) {
        console.warn("Tidak dapat memuat pilihan jadwal:", e);
    }
}

function saveJadwalSelections() {
    const selections = {};
    const jadwalDropdownIds = [
        'j_nama1a_baru', 'j_nama1b_baru', 'j_nama2a_baru', 'j_nama2b_baru',
        'j_nama3a_baru', 'j_nama3b_baru', 'j_nama3c_baru', 'j_nama3d_baru',
        'j_nama4a_baru', 'j_nama4b_baru', 'j_nama4c_baru', 'j_nama4d_baru'
    ];
    jadwalDropdownIds.forEach(id => {
        const select = document.getElementById(id);
        if (select) selections[id] = select.value;
    });
    try {
        localStorage.setItem('jadwalSelections', JSON.stringify(selections));
    } catch (e) {}
}

function updateJadwalPreview() {
    saveJadwalSelections();

    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    const formatTanggal = function(date) {
        const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        return days[date.getDay()] + ", " + date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear();
    };

    let result = "_______________________\n" +
        "*KORAMIL 1609-05/SUKASADA*\n" +
        "    *JADWAL DINAS DALAM*\n" +
        "_______________________\n\n";

    const sections = [
        { title: formatTanggal(now), names: [document.getElementById('j_nama1a_baru').value, document.getElementById('j_nama1b_baru').value] },
        { title: formatTanggal(tomorrow), names: [document.getElementById('j_nama2a_baru').value, document.getElementById('j_nama2b_baru').value] },
        { title: formatTanggal(now) + " (Kediaman)", names: [document.getElementById('j_nama3a_baru').value, document.getElementById('j_nama3b_baru').value] },
        { title: formatTanggal(tomorrow) + " (Kediaman)", names: [document.getElementById('j_nama3c_baru').value, document.getElementById('j_nama3d_baru').value] },
        { title: formatTanggal(now) + " (Makodim)", names: [document.getElementById('j_nama4a_baru').value, document.getElementById('j_nama4b_baru').value] },
        { title: formatTanggal(tomorrow) + " (Makodim)", names: [document.getElementById('j_nama4c_baru').value, document.getElementById('j_nama4d_baru').value] }
    ];

    let sectionCount = 0;
    sections.forEach(function(section) {
        const validNames = section.names.filter(function(name) {
            return name && name.trim() !== '' &&
                name !== '<Pilih Nama>' &&
                name.toLowerCase() !== 'nihil';
        });
        if (validNames.length > 0) {
            const sectionLetter = String.fromCharCode(65 + sectionCount);
            result += sectionLetter + ". " + section.title + "\n";
            validNames.forEach(function(name, i) {
                result += "   " + (i + 1) + ". " + name + "\n";
            });
            result += "\n";
            sectionCount++;
        }
    });

    if (JadwalData.currentHanpangan) {
        result += "*-Jadwal Hanpangan hari ini :* " + JadwalData.currentHanpangan + "\n\n";
    }

    result += "*Demikian MMP.*";

    const preview = document.getElementById('j_hasilPesanBaru');
    if (preview) preview.value = result;
}

function updateDesaHeaderImage(desaName) {
    const headerImage = document.getElementById('desaProfileImgHeader');
    if (!headerImage) return;

    const localDefaultUrl = 'icons/favicon-96x96.png';

    if (!desaName) {
        headerImage.src = localDefaultUrl;
        return;
    }

    const desaInfo = normalizeDesaName(desaName);
    const imageName = desaInfo.normalized;
    const localUrl = `profile/${imageName}.png`;

    headerImage.src = localUrl;
    headerImage.onerror = function() {
        headerImage.onerror = null;
        headerImage.src = localDefaultUrl;
    };
}
