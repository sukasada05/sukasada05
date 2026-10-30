function confirmSubmissionDialog() {
    return new Promise((resolve) => {
        const confirmText = `Anda yakin ingin mengirim laporan untuk ${normalizeDesaName(selectedDesa).cleanName}?\n\nFile ZIP akan dikirim ke Google Drive tanpa download lokal.`;
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
            showNotification(`⚠ Upload ke Google Drive gagal. File tidak disimpan di lokal.`, "warning");
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
