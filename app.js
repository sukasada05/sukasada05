// ================= KONFIGURASI AMAN =================
const APP_CONFIG = {
    googleAppsScriptWebhook: "https://script.google.com/macros/s/AKfycbyiJ0uO36CdtGUiy8m03jzwMAUWWMwIILpdBLt5J41ne6aQWHYIp_Cr_Ke6K8iqn4gZ/exec",
    absenScriptUrl: "https://script.google.com/macros/s/AKfycbxcKBFM8Mm0A8e_hWfl48uEUuDhlmxK8okgXF4M-102HLEuROZPN9YZlpmKnkRo8b_SKA/exec",
    allowedImageTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxImageSize: 10 * 1024 * 1024
};

const TARGET_LAPORAN = 9;

// ================= VARIABEL GLOBAL =================
let img = new Image();
let selectedDesa = "";
let kordinatList = [];
let currentKoordinat = "";
let desaCoordinatesRequestId = 0;
let driveReportRequestId = 0;
let activeDriveReportKey = "";
let loadedDriveReportKey = "";
let tanggalWaktu = "";
let narrativeDatePrefix = "";
let submittedDates = [];
let desaCounter = {};
let deferredPrompt = null;
let swWaiting = null;
const canvasPlaceholderImage = new Image();
canvasPlaceholderImage.src = 'icons/favicon-96x96.png';

function safeLocalStorageGet(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
        console.warn(`localStorage unavailable for ${key}:`, error);
        return fallback;
    }
}

function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`Failed to save ${key} to localStorage:`, error);
        return false;
    }
}

function showNotification(message, type = 'info') {
    const toast = document.getElementById('win98Toast');
    if (toast) {
        toast.textContent = message;
        toast.className = 'win98-toast show';
        if (type === 'success') toast.className += ' success';
        else if (type === 'error') toast.className += ' error';
        else if (type === 'warning') toast.className += ' warning';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
        return;
    }

    // fallback message if toast element doesn't exist
    const fallback = document.createElement('div');
    fallback.style.position = 'fixed';
    fallback.style.bottom = '20px';
    fallback.style.right = '20px';
    fallback.style.zIndex = '999999';
    fallback.style.borderRadius = '8px';
    fallback.style.background = type === 'error' ? '#c62828' : type === 'warning' ? '#ef6c00' : '#2e7d32';
    fallback.style.color = '#fff';
    fallback.style.padding = '12px 16px';
    fallback.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    fallback.style.fontSize = '14px';
    fallback.style.fontWeight = '600';
    fallback.textContent = message;
    document.body.appendChild(fallback);
    setTimeout(() => fallback.remove(), 3000);
}

canvasPlaceholderImage.onload = function() {
    const canvas = document.getElementById('canvas');
    if (canvas && (!img || !img.src)) updatePreview();
};

function getInstallButton() {
    return document.getElementById('installButton');
}

function isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function updateInstallButtonState() {
    const btn = getInstallButton();
    if (!btn) return;

    if (swWaiting) {
        btn.style.display = 'flex';
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Update';
        return;
    }

    if (!isStandaloneMode() && deferredPrompt) {
        btn.style.display = 'flex';
        btn.innerHTML = '<i class="fas fa-download"></i> Install App';
        return;
    }

    btn.style.display = 'none';
}

function setWaitingServiceWorker(worker) {
    swWaiting = worker;
    updateInstallButtonState();
    showNotification('⚡ Update tersedia! Tekan tombol untuk memperbarui.', 'success');
}

let currentApp = null;
let isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isAndroidDevice = /Android/i.test(navigator.userAgent);

if (isAndroidDevice) {
    document.documentElement.classList.add('android-device');
}

function isValidImageFile(file) {
    if (!file) return false;

    const type = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();
    const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
    const validExtensions = ['png', 'jpg', 'jpeg', 'webp'];

    const hasValidType = APP_CONFIG.allowedImageTypes.includes(type);
    const hasValidExtension = validExtensions.includes(extension);

    if (!hasValidType && !hasValidExtension) {
        return false;
    }

    if (typeof file.size === 'number' && file.size > APP_CONFIG.maxImageSize) {
        return false;
    }

    return true;
}

function parseLocalDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getIsFileProtocol() {
    return window.location.protocol === 'file:';
}

function hasValidDataUrl(value) {
    return typeof value === 'string' && /^data:image\//i.test(value);
}

function createAbortSignal(timeoutMs = 15000) {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(timeoutMs);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
    return controller.signal;
}

// ================= PEMILIHAN WILAYAH AWAL =================
document.addEventListener('DOMContentLoaded', function () {
    const splashScreen = document.getElementById('splashScreen');
    if (!splashScreen) return;
    const startupDesa = document.getElementById('startupDesa');
    if (!startupDesa) return;
    loadDesaList();
    loadRunningText();
});

setInterval(() => {
    const tanggalEl = document.getElementById('tanggalWaktu');
    if (tanggalEl && tanggalEl.value) updateDatePreview();
}, 1000);

async function loadRunningText() {
    const target = document.getElementById('runningTextContent');
    if (!target) return;
    try {
        const response = await fetch('running-txt/running.txt?t=' + Date.now(), { signal: createAbortSignal(15000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = (await response.text()).trim();
        if (text) target.textContent = text;
    } catch (error) {
        console.warn('Running text menggunakan teks bawaan:', error);
    }
}

// ================= LOAD APP =================
async function loadDukopsApp() {
    currentApp = 'dukops';
    showApp();
    await initializeApp();
    const desaSelect = document.getElementById('selectDesa');
    if (desaSelect && window.startupDesaValue) {
        desaSelect.value = window.startupDesaValue;
        await loadSelectedDesa();
        window.startupDesaValue = '';
    }
}

window.continueToDashboard = async function() {
    const startupDesa = document.getElementById('startupDesa');
    const startupContinue = document.getElementById('startupContinue');
    if (!startupDesa || !startupContinue) return;

    if (!startupDesa.value) {
        showNotification('Pilih desa/kelurahan terlebih dahulu.', 'error');
        startupDesa.focus();
        return;
    }

    window.startupDesaValue = startupDesa.value;
    startupContinue.disabled = true;
    try {
        await loadDukopsApp();
    } finally {
        startupContinue.disabled = false;
    }
};

function showApp() {
    const splash = document.getElementById('splashScreen');
    const app = document.getElementById('appContainer');
    if (splash) splash.style.display = 'none';
    if (app) {
        app.classList.remove('startup-dashboard');
        app.style.display = 'block';
        app.style.opacity = '1';
    }
    const dukopsBtn = document.getElementById('btnDukops');
    if (dukopsBtn) dukopsBtn.classList.add('active');
    const dukopsContent = document.getElementById('dukopsContent');
    const absenContent = document.getElementById('absenContent');
    const hanpanganContent = document.getElementById('hanpanganContent');
    if (dukopsContent) dukopsContent.style.display = 'block';
    if (absenContent) absenContent.style.display = 'none';
    if (hanpanganContent) hanpanganContent.style.display = 'none';
    if (hanpanganContent) hanpanganContent.classList.remove('active');
}

window.exitApp = function() {
    resetForm();
    currentApp = null;

    const splash = document.getElementById('splashScreen');
    const app = document.getElementById('appContainer');
    const startupDesa = document.getElementById('startupDesa');
    if (startupDesa) startupDesa.value = '';

    if (app) {
        app.style.display = 'none';
        app.style.opacity = '0';
        app.classList.add('startup-dashboard');
    }

    if (splash) splash.style.display = 'flex';
};

// ================= NAVIGASI TAB =================
window.showDukops = function() {
    const dukopsContent = document.getElementById('dukopsContent');
    const absenContent = document.getElementById('absenContent');
    const hanpanganContent = document.getElementById('hanpanganContent');
    if (dukopsContent) dukopsContent.style.display = 'block';
    if (absenContent) absenContent.style.display = 'none';
    if (hanpanganContent) hanpanganContent.style.display = 'none';
    if (hanpanganContent) hanpanganContent.classList.remove('active');
    const btnDukops = document.getElementById('btnDukops');
    const btnAbsen = document.getElementById('btnAbsen');
    const btnHanpangan = document.getElementById('btnHanpangan');
    if (btnDukops) btnDukops.classList.add('active');
    if (btnAbsen) btnAbsen.classList.remove('active');
    if (btnHanpangan) btnHanpangan.classList.remove('active');
    currentApp = 'dukops';
};

window.showAbsenTab = function() {
    const dukopsContent = document.getElementById('dukopsContent');
    const absenContent = document.getElementById('absenContent');
    const hanpanganContent = document.getElementById('hanpanganContent');
    if (dukopsContent) dukopsContent.style.display = 'none';
    if (absenContent) absenContent.style.display = 'block';
    if (hanpanganContent) hanpanganContent.style.display = 'none';
    if (hanpanganContent) hanpanganContent.classList.remove('active');
    const btnDukops = document.getElementById('btnDukops');
    const btnAbsen = document.getElementById('btnAbsen');
    const btnHanpangan = document.getElementById('btnHanpangan');
    if (btnDukops) btnDukops.classList.remove('active');
    if (btnAbsen) btnAbsen.classList.add('active');
    if (btnHanpangan) btnHanpangan.classList.remove('active');
    if (typeof loadAbsenTahun === 'function') loadAbsenTahun();
};

window.showHanpangan = function() {
    const dukopsContent = document.getElementById('dukopsContent');
    const absenContent = document.getElementById('absenContent');
    const hanpanganContent = document.getElementById('hanpanganContent');
    if (dukopsContent) dukopsContent.style.display = 'none';
    if (absenContent) absenContent.style.display = 'none';
    if (hanpanganContent) hanpanganContent.style.display = 'block';
    if (hanpanganContent) hanpanganContent.classList.add('active');
    const btnDukops = document.getElementById('btnDukops');
    const btnAbsen = document.getElementById('btnAbsen');
    const btnHanpangan = document.getElementById('btnHanpangan');
    if (btnDukops) btnDukops.classList.remove('active');
    if (btnAbsen) btnAbsen.classList.remove('active');
    if (btnHanpangan) btnHanpangan.classList.add('active');
};

// ================= BACKEND =================
async function sendToBackend(action, data = {}) {
    try {
        const allowedActions = [
            'listFiles', 'getConfig', 'test', 'uploadDrive',
            'getJadwalData', 'getDesaList', 'getPetugas', 
            'getPetugasByDate', 'getJadwalEpoch', 'cekGiliran',
            'getPersonelList', 'status', 'saveFile', 'getFile'
        ];
        
        if (!allowedActions.includes(action)) {
            console.warn(`⚠️ Action "${action}" tidak tersedia di backend`);
            return { success: false, error: `Action "${action}" tidak tersedia` };
        }
        
        if (action === 'listFiles' || action === 'getConfig' || action === 'test') {
            let url = `${APP_CONFIG.googleAppsScriptWebhook}?action=${action}`;
            if (action === 'listFiles') {
                if (data.desaFilter) url += `&desaFilter=${encodeURIComponent(data.desaFilter)}`;
                if (data.monthFilter) url += `&monthFilter=${encodeURIComponent(data.monthFilter)}`;
            }
            const response = await fetch(url, { signal: createAbortSignal(15000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
            const response = await fetch(APP_CONFIG.googleAppsScriptWebhook, {
                method: 'POST',
                body: formData,
                signal: createAbortSignal(15000)
            });
            return await response.json();
        }
    } catch (error) {
        console.error(`Error in ${action}:`, error);
        return { success: false, error: error.message };
    }
}

async function updateDriveReportLog(force = false) {
    const countElement = document.getElementById('driveReportCount');
    const logElement = document.getElementById('driveReportLog');
    if (!countElement || !logElement) return;

    const dateInput = document.getElementById('tanggalWaktu');
    const selectedDate = dateInput && dateInput.value ? new Date(dateInput.value) : null;
    const desaInfo = normalizeDesaName(selectedDesa);
    if (!desaInfo.cleanName || !selectedDate || Number.isNaN(selectedDate.getTime())) {
        driveReportRequestId++;
        activeDriveReportKey = "";
        loadedDriveReportKey = "";
        countElement.textContent = "0";
        logElement.innerHTML = '<li class="drive-report-empty">Pilih desa/kelurahan dan tanggal untuk melihat file terkirim.</li>';
        return null;
    }

    const monthName = selectedDate.toLocaleDateString('id-ID', { month: 'long' });
    const monthYear = selectedDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const reportKey = `${desaInfo.cleanName.toLowerCase()}|${monthName.toLowerCase()}`;
    if (!force && (activeDriveReportKey === reportKey || loadedDriveReportKey === reportKey)) return null;

    const requestId = ++driveReportRequestId;
    activeDriveReportKey = reportKey;
    countElement.textContent = "…";
    logElement.innerHTML = '<li class="drive-report-empty">Memuat daftar file terkirim dari Google Drive...</li>';

    try {
        const result = await sendToBackend('listFiles', {
            desaFilter: desaInfo.cleanName,
            monthFilter: monthName
        });
        if (requestId !== driveReportRequestId) return null;
        if (!result || result.success === false) {
            throw new Error(result && result.error ? result.error : "Daftar file tidak dapat dimuat.");
        }

        let files = null;
        if (Array.isArray(result)) files = result;
        else if (Array.isArray(result.files)) files = result.files;
        else if (Array.isArray(result.data)) files = result.data;
        else if (Array.isArray(result.items)) files = result.items;
        else if (result.data && Array.isArray(result.data.files)) files = result.data.files;
        else if (result.result && Array.isArray(result.result.files)) files = result.result.files;
        if (!files) throw new Error("Format daftar file dari Google Drive tidak dikenali.");

        const zipFiles = files.map(file => {
            const name = typeof file === 'string'
                ? file
                : file && (file.name || file.fileName || file.filename || file.title);
            if (!name) return null;
            const cleanName = String(name).trim();
            const dateMatch = cleanName.match(
                /^(?:\d+\.\s*)?.+?\s+(\d{1,2})\s+(\d{1,2})\s+(\d{4})\.zip$/i
            );
            const dateValue = dateMatch
                ? new Date(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1])).getTime()
                : Number.POSITIVE_INFINITY;
            return { file, name: cleanName, dateValue };
        }).filter(item =>
            item &&
            /\.zip$/i.test(item.name) &&
            item.name.toLowerCase().startsWith(`${desaInfo.cleanName.toLowerCase()} `)
        );
        zipFiles.sort((a, b) => a.dateValue - b.dateValue || a.name.localeCompare(b.name, 'id'));

        countElement.textContent = String(zipFiles.length);
        while (logElement.firstChild) logElement.removeChild(logElement.firstChild);
        if (zipFiles.length === 0) {
            logElement.innerHTML = '<li class="drive-report-empty">Belum ada file terkirim untuk desa/kelurahan dan bulan ini.</li>';
        } else {
            zipFiles.forEach(({ name }, index) => {
                const item = document.createElement('li');
                item.textContent = `${index + 1}. ${name.replace(/\.zip$/i, '')}`;
                logElement.appendChild(item);
            });
        }

        desaCounter[selectedDesa] = {
            count: zipFiles.length,
            files: zipFiles.map(item => item.name).slice(-TARGET_LAPORAN),
            month: monthYear
        };
        safeLocalStorageSet('dukopsDesaCounter', desaCounter);
        loadedDriveReportKey = reportKey;
        if (zipFiles.length >= TARGET_LAPORAN) {
            redirectToThankYou(desaInfo.original, zipFiles.length, monthYear);
        }
        return zipFiles.length;
    } catch (error) {
        if (requestId !== driveReportRequestId) return null;
        loadedDriveReportKey = "";
        console.error("Gagal memuat log file Google Drive:", error);
        countElement.textContent = "—";
        logElement.innerHTML = '<li class="drive-report-error">Gagal memuat log Google Drive. Periksa koneksi lalu pilih kembali desa atau bulan.</li>';
        return null;
    } finally {
        if (requestId === driveReportRequestId) activeDriveReportKey = "";
    }
}

function redirectToThankYou(desaName, count, monthYear) {
    if (!Number.isInteger(count) || count < TARGET_LAPORAN) return false;

    saveLastSuccessfulReport(desaName, count, monthYear);
    const thankYouParams = new URLSearchParams({
        desa: desaName,
        count: String(count),
        month: monthYear
    });
    window.location.href = `thankyou.html?${thankYouParams.toString()}`;
    return true;
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

async function blobToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

// ================= PWA INSTALL =================
function setupInstallPrompt() {
    const btn = getInstallButton();

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        updateInstallButtonState();
    });

    if (btn) {
        btn.addEventListener('click', async () => {
            if (swWaiting) {
                swWaiting.postMessage({ type: 'SKIP_WAITING' });
                return;
            }
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                deferredPrompt = null;
                showNotification('✅ Aplikasi berhasil diinstall!', 'success');
            }
            updateInstallButtonState();
        });
    }

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        updateInstallButtonState();
    });

    window.addEventListener('load', updateInstallButtonState);
    document.addEventListener('visibilitychange', updateInstallButtonState);
    window.addEventListener('focus', updateInstallButtonState);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            swWaiting = null;
            updateInstallButtonState();
            window.location.reload();
        });
    }
}

// ================= FUNGSI DUKOPS =================
async function initializeApp() {
    console.log("🔄 Initializing DUKOPS app...");
    try {
        console.log('initializeApp: before loadDesaList');
        try { await loadDesaList(); console.log('initializeApp: loadDesaList OK'); } catch(e){ console.error('initializeApp: loadDesaList error', e); }
        try { loadLastSubmittedDates(); } catch(e){ console.error('initializeApp: loadLastSubmittedDates error', e); }
        try { loadDesaCounter(); } catch(e){ console.error('initializeApp: loadDesaCounter error', e); }

        try {
            const tanggalEl = document.getElementById('tanggalWaktu');
            if (tanggalEl) tanggalEl.value = '';
            updateDatePreview();
            console.log('initializeApp: waiting for date input');
        } catch (e) {
            console.error('initializeApp: error setting tanggalWaktu/updateDatePreview', e);
        }

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

function buildCoordinateJsonPath(desaName) {
    const cleanName = String(desaName || '').trim();
    if (!cleanName) return 'data/coordinates/.json';
    const encoded = encodeURIComponent(cleanName).replace(/%20/g, ' ');
    return `data/coordinates/${encoded}.json`;
}

async function loadDesaList() {
    const select = document.getElementById('selectDesa');
    const startupSelect = document.getElementById('startupDesa');
    const loading = document.getElementById('loadingDesa');
    if (!select) return;
    if (loading) loading.style.display = 'block';

    try {
        const response = await fetch('data/desa-list.json?t=' + Date.now(), { signal: createAbortSignal(15000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const desaList = (data.desaList || []).map(name => ({ name, type: 'Desa' }));
        const kelurahanList = (data.kelurahanList || []).map(name => ({ name, type: 'Kelurahan' }));
        const wilayahList = [...desaList, ...kelurahanList];

        select.innerHTML = '<option value="">-- Pilih Desa/Kelurahan --</option>';
        wilayahList.forEach(wilayah => {
            const desaName = wilayah.name;
            const option = document.createElement('option');
            const jsonPath = buildCoordinateJsonPath(desaName);
            option.value = jsonPath;
            option.textContent = `${wilayah.type} ${desaName}`;
            option.setAttribute('data-raw-name', `${wilayah.type} ${desaName}`);
            select.appendChild(option);
        });
        if (startupSelect) {
            startupSelect.innerHTML = '<option value="">-- Pilih Desa/Kelurahan --</option>';
            Array.from(select.options).slice(1).forEach((option, index) => {
                const startupOption = option.cloneNode(true);
                startupOption.textContent = `${index + 1}. ${option.textContent}`;
                startupSelect.appendChild(startupOption);
            });
        }
        console.log(`✅ Loaded ${wilayahList.length} wilayah (${desaList.length} desa, ${kelurahanList.length} kelurahan)`);
        showNotification('✅ Daftar desa berhasil dimuat', 'success');
    } catch (error) {
        console.error("❌ Error loading desa list:", error);
        select.innerHTML = '<option value="">-- Gagal memuat desa --</option>';
        select.disabled = true;
        showNotification('❌ Gagal memuat daftar desa. Periksa koneksi.', 'error');
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    try {
        const select = document.getElementById('selectDesa');
        if (select && select.options && select.options.length > 1) {
            const evt = new Event('change');
            select.dispatchEvent(evt);
        }
    } catch (e) {}
});

(function tryEarlyLoadDesa(){
    const run = () => {
        try {
            if (typeof loadDesaList === 'function') {
                loadDesaList().catch(()=>{});
            }
        } catch (e) {}
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        setTimeout(run, 0);
    }
})();

function ensureDesaListLoaded(maxAttempts = 6, delayMs = 500) {
    let attempts = 0;
    const tryLoad = () => {
        attempts++;
        try {
            if (typeof loadDesaList === 'function') {
                loadDesaList().then(() => {
                    const select = document.getElementById('selectDesa');
                    if (select && select.options && select.options.length > 1) return;
                    if (attempts < maxAttempts) setTimeout(tryLoad, delayMs);
                }).catch(() => {
                    if (attempts < maxAttempts) setTimeout(tryLoad, delayMs);
                });
            } else {
                if (attempts < maxAttempts) setTimeout(tryLoad, delayMs);
            }
        } catch (e) {
            if (attempts < maxAttempts) setTimeout(tryLoad, delayMs);
        }
    };
    tryLoad();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => ensureDesaListLoaded()); else ensureDesaListLoaded();

setTimeout(() => { try { if (typeof loadDesaList === 'function') loadDesaList().catch(()=>{}); } catch (e) {} }, 120);

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

function updateKegiatanLabel() {
    const label = document.getElementById('labelNarasiKegiatan');
    if (!label) return;
    label.textContent = selectedDesa
        ? `Kegiatan: Babinsa  ${normalizeDesaName(selectedDesa).cleanName}.`
        : 'Kegiatan: Babinsa';
}

function showDesaActivationPopup(previewElement) {
    if (previewElement) previewElement.textContent = "Koordinat belum tersedia";
    showNotification('Aktivasi desa/kelurahan belum tersedia. Hubungi admin untuk konfigurasi.', 'warning');
}

async function loadSelectedDesa() {
    const select = document.getElementById('selectDesa');
    const requestId = ++desaCoordinatesRequestId;

    if (!select) return;
    if (!select.value) {
        resetForm();
        return;
    }

    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption) {
        resetForm();
        return;
    }

    const jsonPath = select.value;
    const loading = document.getElementById('loadingKoordinat');

    selectedDesa = selectedOption.getAttribute('data-raw-name') || selectedOption.textContent || '';
    kordinatList = [];
    currentKoordinat = "";
    updateKegiatanLabel();
    updateNarrativePrefix();

    updateDesaHeaderImage(selectedDesa);

    const desaInfo = normalizeDesaName(selectedDesa);
    const previewDesaEl = document.getElementById('previewDesa');
    if (previewDesaEl) {
        previewDesaEl.textContent = desaInfo.cleanName;
        previewDesaEl.style.display = 'block';
    }
    updateDriveReportLog();

    const fotoLabel = document.getElementById('labelFotoKegiatan');
    if (fotoLabel) fotoLabel.innerHTML = `<i class="fas fa-camera"></i> Foto Kegiatan: ${desaInfo.cleanName}`;

    if (loading) loading.style.display = 'block';
    const previewKordinatEl = document.getElementById('previewKordinat');
    if (previewKordinatEl) previewKordinatEl.textContent = "Memuat koordinat...";

    try {
        console.log(`📂 Fetching coordinates from: ${jsonPath}`);
        const response = await fetch(jsonPath, { signal: createAbortSignal(15000) });
        if (requestId !== desaCoordinatesRequestId) return;
        if (response.status === 404) {
            showDesaActivationPopup(previewKordinatEl);
            return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        let jsonData;
        try {
            jsonData = await response.json();
        } catch (error) {
            if (!(error instanceof SyntaxError)) throw error;
            if (requestId !== desaCoordinatesRequestId) return;
            showDesaActivationPopup(previewKordinatEl);
            return;
        }
        if (requestId !== desaCoordinatesRequestId) return;
        const coordinates = Array.isArray(jsonData.coordinates)
            ? jsonData.coordinates.filter(coord =>
                coord &&
                coord.lat !== null && coord.lat !== undefined && String(coord.lat).trim() !== '' &&
                coord.lon !== null && coord.lon !== undefined && String(coord.lon).trim() !== '' &&
                Number.isFinite(Number(coord.lat)) &&
                Number.isFinite(Number(coord.lon)))
            : [];
        if (coordinates.length === 0) {
            showDesaActivationPopup(previewKordinatEl);
            return;
        }
        kordinatList = coordinates.map(coord => `${coord.lat},${coord.lon},${coord.elevation || ''}`);
        console.log(`📌 Loaded ${kordinatList.length} coordinates`);
        pickRandomKoordinat();
        showNotification(`Koordinat ${desaInfo.cleanName} dimuat (${kordinatList.length} titik)`, "success");
    } catch (error) {
        if (requestId !== desaCoordinatesRequestId) return;
        console.error("❌ Error loading coordinates:", error);
        if (previewKordinatEl) previewKordinatEl.textContent = "Gagal memuat koordinat";
        showNotification("Gagal memuat koordinat: " + error.message, "error");
    } finally {
        if (requestId === desaCoordinatesRequestId) {
            if (loading) loading.style.display = 'none';
            updatePreview();
            updateNarrativePrefix();
            checkInputCompletion();
        }
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
    if (!coordElement) return;
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
    const gambarInput = document.getElementById("gambar");
    const file = gambarInput && gambarInput.files ? gambarInput.files[0] : null;
    const gambarNama = document.getElementById("gambarNama");

    if (gambarNama) gambarNama.textContent = file ? file.name : "Belum ada foto dipilih";

    if (file) {
        if (!isValidImageFile(file)) {
            gambarInput.value = "";
            if (gambarNama) gambarNama.textContent = "Belum ada foto dipilih";
            showNotification('Format gambar tidak valid. Gunakan JPG, PNG, atau WebP dengan ukuran maksimal 10MB.', 'warning');
            img = new Image();
            updatePreview();
            checkInputCompletion();
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                try {
                    if (img.height > img.width) {
                        gambarInput.value = "";
                        if (gambarNama) gambarNama.textContent = "Belum ada foto dipilih";
                        img = new Image();
                        showNotification("Foto portrait tidak diperbolehkan. Gunakan foto landscape.", "warning");
                        checkInputCompletion();
                        return;
                    }
                } catch (e) {}
                if (kordinatList.length > 0) pickRandomKoordinat();
                updatePreview();
                updateNarrativePrefix();
            };
            img.onerror = function() {
                showNotification("Gagal memuat gambar", "error");
                gambarInput.value = "";
                if (gambarNama) gambarNama.textContent = "Belum ada foto dipilih";
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
    const tglEl = document.getElementById("tanggalWaktu");
    const label = document.getElementById('tanggalWaktuLabelText');
    const display = document.getElementById('tanggalWaktuDisplay');
    const tglInput = tglEl ? tglEl.value : '';

    if (tglInput) {
        const date = parseLocalDateTime(tglInput);
        if (!date) {
            tanggalWaktu = "";
            if (display) display.textContent = 'INPUT TANGGAL';
            if (label) label.textContent = 'Pilih tanggal & waktu';
            updatePreview();
            checkInputCompletion();
            return;
        }

        tanggalWaktu = tglInput;
        const displayText = formatNarrativeDateTime(date);
        if (label) label.textContent = displayText;
        if (display) display.textContent = displayText;
        updateNarrativePrefix();
    } else {
        if (display) display.textContent = 'INPUT TANGGAL';
        if (!tglEl) {
            if (tanggalWaktu) {
                try {
                    const date = parseLocalDateTime(tanggalWaktu);
                    const displayText = date ? formatNarrativeDateTime(date) : 'Pilih tanggal & waktu';
                    if (label) label.textContent = displayText;
                    if (display) display.textContent = displayText;
                } catch (e) {}
            } else {
                if (label) label.textContent = 'Pilih tanggal & waktu';
            }

        } else {
            tanggalWaktu = "";
            if (label) label.textContent = 'Pilih tanggal & waktu';
            if (display) display.textContent = 'TANGGAL & WAKTU';
        }
    }
    updateDriveReportLog();
    updatePreview();
    checkInputCompletion();
}

function formatNarrativeDateTime(date) {
    const dateText = date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    const timeText = date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(/:/g, '.');
    return `${dateText}, ${timeText} Wita`;
}

function updateNarrativePrefix() {
    const narasiEl = document.getElementById('narasi');
    if (!narasiEl) return;
    if (!selectedDesa || !tanggalWaktu || !img || !img.src || !img.complete || !img.naturalWidth) return;

    const date = new Date(tanggalWaktu);
    const dateText = date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    const desaInfo = normalizeDesaName(selectedDesa);
    const nextPrefix = `${dateText}    Babinsa ${desaInfo.cleanName} `;
    const currentText = narasiEl.value || '';

    if (!currentText || currentText === narrativeDatePrefix) {
        narasiEl.value = nextPrefix;
    } else if (narrativeDatePrefix && currentText.startsWith(narrativeDatePrefix)) {
        narasiEl.value = nextPrefix + currentText.slice(narrativeDatePrefix.length);
    } else {
        return;
    }

    narrativeDatePrefix = nextPrefix;
    narasiEl.setSelectionRange(narasiEl.value.length, narasiEl.value.length);
    autoResizeNarasi(narasiEl);
    checkInputCompletion();
}

function openDatePicker(event) {
    const input = document.getElementById('tanggalWaktu');
    if (!input) return;
    if (event && event.target !== input) event.preventDefault();
    input.focus();
    if (typeof input.showPicker === 'function') input.showPicker();
}

function updatePreview() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return;

    const hasImage = Boolean(img && img.src && img.complete && img.naturalWidth > 0);
    canvas.style.display = hasImage ? "block" : "none";
    if (!hasImage) return;

    if (hasImage) {
        canvas.width = 800;
        canvas.height = Math.round(canvas.width * (img.height / img.width));
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (hasImage) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    if (selectedDesa || currentKoordinat || tanggalWaktu) {
        ctx.textAlign = "right";
        ctx.font = "bold 36px Arial";
        const bottomMargin = 20;
        const lineHeight = 44;
        const rightMargin = 10;

        function drawTextWithShadow(text, x, y, color = "#FFFFFF") {
            ctx.save();
            ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
            ctx.lineWidth = 3;
            ctx.strokeText(text, x, y);
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
            ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = -1;
            ctx.shadowOffsetY = -1;
            ctx.fillText(text, x, y);
            ctx.restore();
        }

        if (selectedDesa) {
            const desaInfo = normalizeDesaName(selectedDesa);
            const displayDesaName = desaInfo.cleanName;
            const watermarkText = (displayDesaName === "Sukasada" || displayDesaName === "SUKASADA")
                ? "Babinsa Kelurahan Sukasada"
                : "Babinsa " + displayDesaName;
            
            drawTextWithShadow(
                watermarkText, 
                canvas.width - rightMargin, 
                canvas.height - bottomMargin - (lineHeight * 2)
            );
        }

        if (currentKoordinat) {
            drawTextWithShadow(
                currentKoordinat, 
                canvas.width - rightMargin, 
                canvas.height - bottomMargin - lineHeight
            );
        }

        if (tanggalWaktu) {
            const date = parseLocalDateTime(tanggalWaktu) || new Date(tanggalWaktu);
            let dateText = date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) +
                ", " + date.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false
                });
            
            drawTextWithShadow(
                dateText, 
                canvas.width - rightMargin, 
                canvas.height - bottomMargin
            );
        }
    }
}

function showLoading() {
    document.body.classList.add('loading');
}

function hideLoading() {
    document.body.classList.remove('loading');
}

function confirmSubmissionDialog() {
    return new Promise((resolve) => {
        const confirmText = `Anda yakin ingin mengirim laporan untuk ${normalizeDesaName(selectedDesa).cleanName}?\n\nFile ZIP akan didownload dan dikirim ke Drive.`;
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.background = 'rgba(0,0,0,0.72)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '999999';
        modal.innerHTML = `
            <div style="background:#0c1a24;border:2px solid #5bb9ff;border-radius:14px;padding:24px;width:min(440px,90vw);color:#fff;box-shadow:0 24px 60px rgba(0,0,0,0.6);">
                <div style="font-size:22px;font-weight:700;margin-bottom:12px;">Konfirmasi Laporan</div>
                <div style="font-size:15px;line-height:1.5;color:#d9ebff;white-space:pre-line;">${confirmText}</div>
                <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;">
                    <button id="cancelSubmit" style="padding:10px 16px;border:none;border-radius:10px;background:#4a5568;color:#fff;font-weight:700;cursor:pointer;">Batal</button>
                    <button id="confirmSubmit" style="padding:10px 16px;border:none;border-radius:10px;background:#2e7d32;color:#fff;font-weight:700;cursor:pointer;">Kirim</button>
                </div>
            </div>
        `;
        const cancel = modal.querySelector('#cancelSubmit');
        const confirm = modal.querySelector('#confirmSubmit');
        cancel.addEventListener('click', () => { modal.remove(); resolve(false); });
        confirm.addEventListener('click', () => { modal.remove(); resolve(true); });
        document.body.appendChild(modal);
    });
}

async function processSubmission() {
    if (!validateSubmission()) return;
    if (isSameDateMonthSubmission()) {
        showNotification("⚠ Sudah ada laporan di tanggal dan bulan yang sama!", "warning");
        return;
    }

    const confirmed = await confirmSubmissionDialog();
    if (!confirmed) return;

    const button = document.getElementById("submitBtn");
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    showLoading();

    try {
        const canvas = document.getElementById("canvas");
        const imgData = canvas.toDataURL("image/png");
        const narasi = document.getElementById("narasi").value;
        const date = parseLocalDateTime(tanggalWaktu) || new Date(tanggalWaktu);

        const day = String(date.getDate()).padStart(2, '0');
        const monthNum = String(date.getMonth() + 1).padStart(2, '0');
        const monthName = date.toLocaleDateString('id-ID', { month: 'long' });
        const monthYear = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
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

        const narasiWithoutDate = narrativeDatePrefix && narasi.startsWith(narrativeDatePrefix)
            ? narasi.slice(narrativeDatePrefix.length)
            : narasi;
        const narasiContent = `${formattedDate}\tBabinsa ${desaInfo.cleanName} ${narasiWithoutDate.trimStart()}`;

        const zip = new JSZip();
        zip.file(fileNameInsideZipNarasi, narasiContent);
        zip.file(fileNameInsideZipImage, imgData.split("base64,")[1], { base64: true });

        const content = await zip.generateAsync({ type: "blob" });

        const a = document.createElement("a");
        const objectUrl = URL.createObjectURL(content);
        a.href = objectUrl;
        a.download = zipFileNameForDownload;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

        const driveUploaded = await uploadToGoogleDrive(content, zipFileNameForBackend, selectedDesa, date);

        if (driveUploaded) {
            let desaData = updateDesaCounter(selectedDesa, zipFileNameForBackend);
            const driveCount = await updateDriveReportLog(true);
            if (Number.isInteger(driveCount)) {
                desaData = desaCounter[selectedDesa];
            }
            saveLastSuccessfulReport(desaInfo.original, desaData.count, monthYear);
            saveSubmittedDate(tanggalWaktu);
            if (!redirectToThankYou(desaInfo.original, desaData.count, monthYear)) {
                showNotification(
                    `✅ Laporan berhasil dikirim (${desaData.count}/${TARGET_LAPORAN}). Silakan kirim laporan berikutnya.`,
                    "success"
                );
                clearInputsAfterSuccessfulSend();
            }
        } else {
            showNotification(`⚠ Laporan hanya didownload, gagal simpan ke Drive`, "warning");
            saveSubmittedDate(tanggalWaktu);
        }

    } catch (error) {
        console.error("Error:", error);
        showNotification("❌ Gagal mengirim laporan", "error");
    } finally {
        hideLoading();
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

function clearInputsAfterSuccessfulSend() {
    img = new Image();
    tanggalWaktu = "";
    const tanggalWaktuEl = document.getElementById('tanggalWaktu');
    if (tanggalWaktuEl) tanggalWaktuEl.value = "";
    const narasiEl = document.getElementById('narasi');
    if (narasiEl) narasiEl.value = "";
    narrativeDatePrefix = "";
    const gambarEl = document.getElementById('gambar');
    if (gambarEl) gambarEl.value = "";
    const gambarNama = document.getElementById('gambarNama');
    if (gambarNama) gambarNama.textContent = "Belum ada foto dipilih";
    updatePreview();
    resetCanvas();
    checkInputCompletion();
}

function validateSubmission() {
    if (!selectedDesa) { showNotification("Masukkan nama desa terlebih dahulu", "warning"); return false; }
    if (!currentKoordinat) { showNotification("Koordinat tidak valid", "warning"); return false; }
    if (!tanggalWaktu) { showNotification("Isi tanggal dan waktu", "warning"); return false; }
    if (!img.src || !img.complete) { showNotification("Upload foto kegiatan", "warning"); return false; }
    const narasi = document.getElementById("narasi").value.trim();
    if (!narasi) { showNotification("Isi narasi kegiatan", "warning"); return false; }
    return true;
}

function isSameDateMonthSubmission() {
    if (!tanggalWaktu) return false;
    const currentDate = new Date(tanggalWaktu);
    if (Number.isNaN(currentDate.getTime())) return false;
    return submittedDates.some(dateStr => {
        const prevDate = new Date(dateStr);
        if (Number.isNaN(prevDate.getTime())) return false;
        return prevDate.getFullYear() === currentDate.getFullYear() &&
               prevDate.getMonth() === currentDate.getMonth() &&
               prevDate.getDate() === currentDate.getDate();
    });
}

function resetCanvas() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;
    canvas.style.display = "none";
    const ctx = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = Math.round(canvas.width / (16 / 9));
    ctx.fillStyle = "#0a120a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (canvasPlaceholderImage.complete && canvasPlaceholderImage.naturalWidth > 0) {
        const iconSize = Math.min(160, canvas.width * 0.3);
        ctx.drawImage(canvasPlaceholderImage, (canvas.width - iconSize) / 2,
            (canvas.height - iconSize) / 2, iconSize, iconSize);
    }
}

function resetForm() {
    desaCoordinatesRequestId++;
    selectedDesa = "";
    kordinatList = [];
    currentKoordinat = "";
    tanggalWaktu = "";
    const selectEl = document.getElementById('selectDesa');
    if (selectEl) selectEl.value = "";
    const previewDesaEl = document.getElementById('previewDesa');
    if (previewDesaEl) previewDesaEl.textContent = "";
    const previewKordinatEl = document.getElementById('previewKordinat');
    if (previewKordinatEl) previewKordinatEl.textContent = "";
    const narasiEl = document.getElementById('narasi');
    if (narasiEl) narasiEl.value = "";
    narrativeDatePrefix = "";
    updateKegiatanLabel();
    const gambarEl = document.getElementById('gambar');
    if (gambarEl) gambarEl.value = "";
    const tanggalWaktuEl = document.getElementById('tanggalWaktu');
    if (tanggalWaktuEl) tanggalWaktuEl.value = "";
    const label = document.getElementById('tanggalWaktuLabelText');
    if (label) label.textContent = 'Pilih tanggal & waktu';
    updateDesaHeaderImage("");
    checkInputCompletion();
    updatePreview();
    resetCanvas();
}

function loadDesaCounter() {
    const saved = safeLocalStorageGet('dukopsDesaCounter', {});
    desaCounter = saved || {};
}

function updateDesaCounter(desaName, fileName) {
    const date = parseLocalDateTime(tanggalWaktu) || new Date(tanggalWaktu);
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

    safeLocalStorageSet('dukopsDesaCounter', desaCounter);
    return desaCounter[desaName];
}

function saveLastSuccessfulReport(desaName, count, monthYear) {
    safeLocalStorageSet('dukopsLastSuccessfulReport', { desaName, count, monthYear });
}

function saveSubmittedDate(dateStr) {
    if (!dateStr) return;
    submittedDates.push(dateStr);
    safeLocalStorageSet('dukopsSubmittedDates', submittedDates);
}

function loadLastSubmittedDates() {
    const saved = safeLocalStorageGet('dukopsSubmittedDates', []);
    submittedDates = Array.isArray(saved) ? saved : [];
}

function checkInputCompletion() {
    const narasiEl = document.getElementById("narasi");
    const narasiVal = narasiEl ? (narasiEl.value || '').trim() : '';
    const hasImage = img && img.src && img.complete;
    const isComplete = selectedDesa && currentKoordinat && tanggalWaktu && hasImage && narasiVal;

    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) submitBtn.disabled = !isComplete;
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
    headerImage.src = 'icons/favicon-96x96.png';
}

function speakTargetReached(wilayahName, count, monthYear) {
    const wilayahInfo = normalizeDesaName(wilayahName);
    const message =
        `Terima kasih Babinsa ${wilayahInfo.original} telah mengirim ${count} laporan untuk ${monthYear}. ` +
        (count >= TARGET_LAPORAN
            ? `Target ${TARGET_LAPORAN} laporan bulan ini tercapai.`
            : `Jumlah laporan terkirim bulan ini ${count} dari ${TARGET_LAPORAN}.`);
    if (typeof window.speakIndonesian === 'function') window.speakIndonesian(message);
}

// ================= POPUP UCAPAN TERIMA KASIH =================
function showThankYouPopup(desaName, count) {
    const date = parseLocalDateTime(tanggalWaktu) || new Date(tanggalWaktu);
    const monthYear = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const desaInfo = normalizeDesaName(desaName);
    const targetReached = count >= TARGET_LAPORAN;
    
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
            <h2 style="color: #9fd49f; margin-bottom: 15px; font-size: 28px;">Terima Kasih</h2>
            <p style="color: #f5f5f5; font-size: 18px; line-height: 1.5; margin-bottom: 20px;">
                Terima kasih <strong>Babinsa ${desaInfo.original}</strong> telah mengirim
                <strong>${count} laporan</strong> untuk <strong>${monthYear}</strong>.
            </p>
            <div style="background: rgba(76, 175, 80, 0.2); border: 2px solid #4CAF50;
                border-radius: 10px; padding: 15px; margin: 20px 0; font-size: 16px; color: #b2d8b2;">
                <i class="fas fa-check-circle"></i>
                ${targetReached
                    ? `Target ${TARGET_LAPORAN} laporan bulan ini tercapai!`
                    : `Jumlah laporan terkirim bulan ${monthYear}: ${count}/${TARGET_LAPORAN}.`}
            </div>
            <button onclick="this.closest('.thankyou-popup').remove()"
                style="background: linear-gradient(135deg, #4CAF50, #2b4d2b); color: white;
                border: none; padding: 12px 25px; border-radius: 8px; font-size: 16px;
                font-weight: bold; width: 100%;">
                <i class="fas fa-thumbs-up"></i> TERIMA KASIH
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    speakTargetReached(desaInfo.original, count, monthYear);
    setTimeout(() => { if (modal.parentNode) modal.remove(); }, 10000);
}

// ================= TAB ABSEN (Google Apps Script) =================
(function() {
    var SCRIPT_URL = APP_CONFIG.absenScriptUrl;
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
        fetch(SCRIPT_URL + '?action=getYears', { signal: createAbortSignal(15000) }).then(function(r) {
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
        fetch(SCRIPT_URL + '?action=getMonths&tahun=' + encodeURIComponent(t), { signal: createAbortSignal(15000) }).then(function(r) {
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
        fetch(SCRIPT_URL + '?action=getData&tahun=' + encodeURIComponent(t) + '&bulan=' + encodeURIComponent(b), { signal: createAbortSignal(15000) })
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
            '</div><div class="absen-stat-label">BELUM</div></div></div><div style="font-size:0.7rem;font-weight:600;margin:10px 0 5px;">📋 DAFTAR DESA (' +
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

    window.loadAbsenTahun = loadAbsenTahun;
})();

// ================= SERVICE WORKER =================
const isFileProtocol = getIsFileProtocol();

if (!isFileProtocol && 'serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        console.log('🔧 Registering Service Worker...');
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                console.log('✅ Service Worker registered successfully!');
                console.log('📦 Scope:', registration.scope);
                if (registration.active) console.log('✅ Service Worker is active!');

                if (registration.waiting) {
                    setWaitingServiceWorker(registration.waiting);
                }

                registration.addEventListener('updatefound', function() {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setWaitingServiceWorker(newWorker);
                            }
                        });
                    }
                });
            })
            .catch(function(error) {
                console.log('❌ Service Worker registration failed:', error);
            });
    });
} else if (isFileProtocol) {
    console.log('⚠️ Service Worker skipped on file:// origin. PWA mode requires local HTTP server.');
} else {
    console.log('⚠️ Service Worker not supported in this browser.');
}
