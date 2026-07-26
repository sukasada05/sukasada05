// ========================================
// COMMON.JS - Shared Utilities & Constants
// VERSI DIPERBAIKI - TANPA DUPLIKASI
// ========================================

// ================================================================
// 1. KONFIGURASI
// ================================================================

/**
 * Google Apps Script Webhook URL
 * Digunakan untuk semua komunikasi dengan backend
 */
const GOOGLE_APPS_SCRIPT_WEBHOOK = "https://script.google.com/macros/s/AKfycbz3sB1d0PRRzlvAJwdr8nl5dQa6qpyfHQCJbYxBMz0Jpj2o-i1_WnwMzJEy3Z4GA9uh/exec";

/**
 * Target laporan per desa per bulan
 */
const TARGET_LAPORAN = 9;

/**
 * URL data dari GitHub
 */
const GITHUB_URLS = {
    HANPANGAN: "data/hanpangan.txt",
    PIKET: "data/piket.txt"
};

// ================================================================
// 2. VARIABEL GLOBAL
// ================================================================

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

/**
 * Data Jadwal Piket
 */
const JadwalData = {
    daftarNama: [],
    daftarHanpangan: [],
    currentHanpangan: ""
};

/**
 * Status aplikasi
 */
let currentApp = null;
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ================================================================
// 3. UTILITY FUNCTIONS
// ================================================================

/**
 * Normalisasi nama desa dari berbagai format
 * @param {string} desaName - Nama desa dengan atau tanpa prefix
 * @returns {object} - Original, normalized, forTelegram, dan cleanName
 */
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

/**
 * Tampilkan notifikasi toast di layar
 * @param {string} message - Pesan yang ditampilkan
 * @param {string} type - Tipe: success, error, warning, info
 */
function showNotification(message, type = 'info') {
    // Cari toast element
    let toast = document.getElementById('win98Toast');
    if (!toast) {
        toast = document.getElementById('j_toastNotificationBaru');
    }
    if (!toast) {
        // Buat toast jika tidak ada
        toast = document.createElement('div');
        toast.id = 'win98Toast';
        toast.className = 'win98-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = 'win98-toast show';
    if (type === 'success') toast.className += ' success';
    else if (type === 'error') toast.className += ' error';
    else if (type === 'warning') toast.className += ' warning';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Format tanggal untuk browser lama (fallback)
 * @param {Date} date - Object tanggal
 * @returns {string} - Format DD-MM-YYYY HH:MM:SS
 */
function formatDateForOldBrowsers(date) {
    const pad = num => (num < 10 ? '0' + num : num);
    return [
        pad(date.getDate()),
        pad(date.getMonth() + 1),
        date.getFullYear()
    ].join('-') + ' ' + [
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds())
    ].join(':');
}

/**
 * Konversi Blob ke Base64 string
 * @param {Blob} blob - File blob untuk dikonversi
 * @returns {Promise<string>} - Base64 encoded string tanpa prefix
 */
async function blobToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

/**
 * Format ukuran file ke format readable (Bytes, KB, MB, GB)
 * @param {number} bytes - Jumlah bytes
 * @returns {string} - Format readable
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Kirim request ke Google Apps Script backend
 * Mendukung GET dan POST requests
 * @param {string} action - Nama action di backend
 * @param {object} data - Data untuk dikirim
 * @returns {Promise<object>} - Response dari backend
 */
async function sendToBackend(action, data = {}) {
    try {
        // Untuk GET requests
        if (['listFiles', 'getConfig', 'test', 'telegramTest', 'getJadwalData'].includes(action)) {
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
        }
        // Untuk POST requests
        else {
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

/**
 * Upload ZIP file ke Google Drive via backend
 * @param {Blob} zipBlob - File ZIP untuk upload
 * @param {string} zipFileName - Nama file ZIP
 * @param {string} desaName - Nama desa
 * @param {Date} date - Tanggal file
 * @returns {Promise<boolean>} - Status sukses/gagal
 */
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

/**
 * Kirim ZIP file ke Telegram via backend
 * @param {Blob} zipBlob - File ZIP untuk dikirim
 * @param {string} filename - Nama file ZIP
 * @param {string} desaName - Nama desa
 * @returns {Promise<boolean>} - Status sukses/gagal
 */
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

// ================================================================
// 4. LOCALSTORAGE HELPERS
// ================================================================

/**
 * Save submission count ke localStorage
 */
function saveSubmissionCount(count) {
    localStorage.setItem('dukopsSubmissionCount', count.toString());
}

/**
 * Load submission count dari localStorage
 */
function loadSubmissionCount() {
    const saved = localStorage.getItem('dukopsSubmissionCount');
    return saved ? parseInt(saved) : 0;
}

/**
 * Load last submitted dates dari localStorage
 */
function loadLastSubmittedDates() {
    try {
        const saved = localStorage.getItem('dukopsSubmittedDates');
        submittedDates = saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error loading submitted dates:', error);
        submittedDates = [];
    }
}

/**
 * Save submitted dates ke localStorage
 */
function saveSubmittedDates(dates) {
    try {
        localStorage.setItem('dukopsSubmittedDates', JSON.stringify(dates));
    } catch (error) {
        console.error('Error saving submitted dates:', error);
    }
}

/**
 * Load desa counter dari localStorage
 */
function loadDesaCounter() {
    try {
        const saved = localStorage.getItem('dukopsDesaCounter');
        desaCounter = saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.error('Error loading desa counter:', error);
        desaCounter = {};
    }
}

/**
 * Save desa counter ke localStorage
 */
function saveDesaCounter(counter) {
    try {
        localStorage.setItem('dukopsDesaCounter', JSON.stringify(counter));
    } catch (error) {
        console.error('Error saving desa counter:', error);
    }
}

// ================================================================
// 5. EXPOSE GLOBAL FUNCTIONS
// ================================================================

// Pastikan fungsi-fungsi ini tersedia di window
window.normalizeDesaName = normalizeDesaName;
window.showNotification = showNotification;
window.sendToBackend = sendToBackend;
window.blobToBase64 = blobToBase64;
window.formatFileSize = formatFileSize;
window.uploadToGoogleDrive = uploadToGoogleDrive;
window.sendZipToTelegram = sendZipToTelegram;

console.log("✅ Common.js loaded - Constants, utilities, and helpers ready");
