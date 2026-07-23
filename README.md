# 📋 Absensi Digital

Website absensi statis (HTML/CSS/JS vanilla) dengan backend Google Apps Script — siap deploy ke GitHub Pages.

## Fitur
- Absen Masuk & Pulang (tab pilihan)
- Input nama, upload foto selfie, tanda tangan digital di canvas
- Validasi form + notifikasi sukses/gagal (toast)
- Tombol reset tanda tangan
- Data absensi tersimpan ke Google Spreadsheet
- Foto selfie & tanda tangan tersimpan ke Google Drive
- Responsif (mobile & desktop)

## Struktur Folder
```
absensi-app/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── apps-script/
│   └── Code.gs
└── README.md
```

---

## 1. Setup Google Spreadsheet

1. Buka [Google Sheets](https://sheets.google.com) dan buat spreadsheet baru, misal beri nama **"Data Absensi"**.
2. Sheet "Absensi" (beserta header kolom) akan **dibuat otomatis** oleh script saat data pertama masuk — tidak perlu dibuat manual.
3. Catat URL spreadsheet ini (tidak perlu ID-nya, karena script akan dijalankan langsung terikat pada spreadsheet ini — lihat langkah 3 di bawah).

## 2. Setup Folder Google Drive

1. Buka [Google Drive](https://drive.google.com), buat folder baru misal **"Foto Absensi"**.
2. Buka folder tersebut, salin **ID folder** dari URL, contoh:
   `https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz`
   ID-nya adalah `1AbCdEfGhIjKlMnOpQrStUvWxYz`.

## 3. Setup Google Apps Script

1. Di spreadsheet "Data Absensi" yang dibuat tadi, klik menu **Extensions/Ekstensi > Apps Script**.
2. Hapus kode default (`Code.gs`), lalu **copy-paste seluruh isi** file [`apps-script/Code.gs`](apps-script/Code.gs) dari repo ini.
3. Ganti baris berikut dengan ID folder Drive Anda dari langkah 2:
   ```js
   const DRIVE_FOLDER_ID = "GANTI_DENGAN_ID_FOLDER_DRIVE_ANDA";
   ```
4. Simpan project (nama bebas, misal "Absensi Backend"), klik ikon 💾.
5. Klik **Deploy > New deployment**.
   - Klik ikon gear ⚙️ di sebelah "Select type", pilih **Web app**.
   - **Description**: Absensi API
   - **Execute as**: Me (akun Anda)
   - **Who has access**: **Anyone** (wajib "Anyone", bukan "Anyone with Google account", agar bisa diakses dari GitHub Pages tanpa login)
6. Klik **Deploy**. Saat pertama kali, Google akan meminta otorisasi:
   - Klik **Authorize access** → pilih akun Google Anda → klik **Advanced** → **Go to (nama project) (unsafe)** → **Allow**.
7. Setelah berhasil, salin **Web app URL** yang muncul (bentuknya seperti):
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
8. Simpan URL ini — akan digunakan di langkah berikutnya.

> **Catatan**: Setiap kali Anda mengubah kode `Code.gs`, Anda harus membuat **New deployment** baru (atau "Manage deployments > Edit > New version") agar perubahan berlaku pada URL yang sama.

## 4. Hubungkan Website ke Apps Script

1. Buka file [`js/script.js`](js/script.js).
2. Ganti baris paling atas:
   ```js
   const SCRIPT_URL = "https://script.google.com/macros/s/GANTI_DENGAN_DEPLOYMENT_ID_ANDA/exec";
   ```
   dengan URL Web App yang Anda salin di langkah 3.7 di atas.
3. Simpan file.

## 5. Deploy ke GitHub Pages

1. Buat repository baru di GitHub, misal `absensi-app` (bisa public atau private, GitHub Pages tetap bisa dipakai untuk public repo secara gratis).
2. Upload semua file di folder `absensi-app/` ini ke root repository tersebut (via web upload, GitHub Desktop, atau git command line):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Absensi Digital"
   git branch -M main
   git remote add origin https://github.com/USERNAME/absensi-app.git
   git push -u origin main
   ```
3. Di repository GitHub, buka **Settings > Pages**.
4. Pada **Build and deployment > Source**, pilih **Deploy from a branch**.
5. Pilih branch **main** dan folder **/ (root)**, lalu klik **Save**.
6. Tunggu 1-2 menit, lalu buka URL yang muncul, biasanya:
   ```
   https://USERNAME.github.io/absensi-app/
   ```
7. Website Anda sudah live dan siap digunakan!

---

## Cara Kerja Singkat

1. User mengisi nama, memilih Masuk/Pulang, mengunggah foto selfie, dan menandatangani di canvas.
2. Saat submit, website memvalidasi semua field wajib diisi.
3. Data (nama, tipe absen, foto base64, tanda tangan base64, waktu) dikirim via `fetch POST` ke Web App Apps Script.
4. Apps Script menyimpan foto & tanda tangan sebagai file PNG ke folder Google Drive, lalu mencatat baris baru di Google Spreadsheet berisi: Tanggal, Jam, Nama, Tipe Absen, Link Foto, Link Tanda Tangan.
5. Website menampilkan notifikasi sukses/gagal (toast) berdasarkan respons server.

## Format Data di Spreadsheet

Secara default, script akan **otomatis membuat tab (sheet) baru setiap hari**, dengan nama tab sesuai tanggal, misal `23-07-2026`, `24-07-2026`, dst. Absensi hari ini dan besok akan tercatat di tab yang berbeda, dan tab hari terbaru selalu ditaruh paling depan.

| Tanggal | Jam | Nama | Tipe Absen | Link Foto Selfie | Link Tanda Tangan |
|---|---|---|---|---|---|
| 23/07/2026 | 08:15:32 | Budi Santoso | Masuk | https://drive.google.com/... | https://drive.google.com/... |

Jika Anda **tidak** ingin tab terpisah per hari (ingin semua absensi dalam satu tab saja), buka `apps-script/Code.gs` dan ubah:
```js
const SHEET_PER_HARI = true;
```
menjadi:
```js
const SHEET_PER_HARI = false;
```
Semua absensi lalu akan dicatat di satu tab bernama `Absensi`. Setelah mengubah kode, buat **New deployment** (atau **Manage deployments > Edit > New version**) agar perubahan berlaku.

## Troubleshooting

- **"Gagal terhubung ke server"**: pastikan `SCRIPT_URL` di `script.js` benar dan deployment diset **Anyone** dapat mengakses.
- **Data tidak muncul di Spreadsheet**: pastikan Apps Script dibuat dari menu Extensions di spreadsheet yang tepat (bukan project Apps Script yang berdiri sendiri/standalone).
- **Foto tidak muncul di Drive**: cek kembali `DRIVE_FOLDER_ID` sudah benar dan folder dapat diakses oleh akun yang sama dengan yang mendeploy script.
- **CORS/Error saat fetch**: ini normal untuk Apps Script Web App, response tetap diterima karena `fetch` menggunakan mode default; pastikan tidak menambahkan header custom selain `Content-Type: text/plain`.
