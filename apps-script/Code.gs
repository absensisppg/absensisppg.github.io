/**
 * Google Apps Script Backend untuk Website Absensi Digital
 * ---------------------------------------------------------
 * Fungsi:
 * - Menerima data POST dari website (nama, tipe, foto, tanda tangan, waktu)
 * - Menyimpan foto selfie & tanda tangan ke Google Drive (folder ditentukan di bawah)
 * - Mencatat data absensi ke Google Spreadsheet
 *
 * CARA SETUP: lihat README.md
 */

// ID folder Google Drive tempat menyimpan foto & tanda tangan.
// Ganti dengan ID folder Drive Anda sendiri.
const DRIVE_FOLDER_ID = "GANTI_DENGAN_ID_FOLDER_DRIVE_ANDA";

// ID Spreadsheet tujuan. Diperlukan karena project Apps Script ini standalone
// (dibuat dari script.google.com, bukan dari menu Extensions di dalam spreadsheet),
// sehingga tidak ada "active spreadsheet" otomatis - harus ditunjuk manual lewat ID ini.
const SPREADSHEET_ID = "GANTI_DENGAN_ID_SPREADSHEET_ANDA";

// Jika true, setiap hari otomatis dibuatkan tab (sheet) baru bernama tanggal, misal "23-07-2026".
// Jika false, semua absensi dicatat dalam satu tab bernama SHEET_NAME.
const SHEET_PER_HARI = true;
const SHEET_NAME = "Absensi";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = JSON.parse(e.postData.contents);

    const nama = (data.nama || "").toString().trim();
    const jabatan = (data.jabatan || "").toString().trim();
    const tipe = (data.tipe || "").toString().trim();
    const fotoBase64 = data.foto || "";
    const signatureBase64 = data.tandaTangan || "";
    const waktuISO = data.waktu || new Date().toISOString();

    if (!nama || !tipe || !fotoBase64 || !signatureBase64) {
      return jsonResponse({ status: "error", message: "Data tidak lengkap." });
    }

    const waktu = new Date(waktuISO);
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    const timestampLabel = Utilities.formatDate(waktu, "GMT+7", "yyyyMMdd_HHmmss");
    const safeName = nama.replace(/[^a-zA-Z0-9]/g, "_");

    const fotoUrl = saveBase64Image(
      folder,
      fotoBase64,
      `Selfie_${safeName}_${tipe}_${timestampLabel}.png`
    );

    const signUrl = saveBase64Image(
      folder,
      signatureBase64,
      `TandaTangan_${safeName}_${tipe}_${timestampLabel}.png`
    );

    const sheet = getOrCreateSheet(waktu);
    sheet.appendRow([
      Utilities.formatDate(waktu, "GMT+7", "dd/MM/yyyy"),
      Utilities.formatDate(waktu, "GMT+7", "HH:mm:ss"),
      nama,
      jabatan,
      tipe,
      fotoUrl,
      signUrl,
    ]);

    return jsonResponse({ status: "success", message: "Absensi berhasil disimpan." });
  } catch (err) {
    return jsonResponse({ status: "error", message: "Kesalahan server: " + err.message });
  } finally {
    lock.releaseLock();
  }
}

function saveBase64Image(folder, base64Data, fileName) {
  const parts = base64Data.split(",");
  const meta = parts[0];
  const contentType = meta.match(/data:(.*);base64/)[1];
  const bytes = Utilities.base64Decode(parts[1]);
  const blob = Utilities.newBlob(bytes, contentType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function getOrCreateSheet(waktu) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = SHEET_PER_HARI
    ? Utilities.formatDate(waktu, "GMT+7", "dd-MM-yyyy")
    : SHEET_NAME;

  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Tanggal", "Jam", "Nama", "Jabatan", "Tipe Absen", "Link Foto Selfie", "Link Tanda Tangan"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#4f46e5").setFontColor("#ffffff");
    sheet.autoResizeColumns(1, 7);

    // Sisipkan tab baru ini di posisi terdepan agar tab hari ini paling mudah ditemukan.
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(1);
  }

  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// Digunakan untuk pengujian manual dari editor Apps Script (opsional)
function doGet() {
  return jsonResponse({ status: "ok", message: "Absensi API aktif." });
}
