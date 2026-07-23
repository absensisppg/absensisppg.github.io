// ==========================================================
// KONFIGURASI
// Ganti URL di bawah dengan URL Web App hasil deploy Google Apps Script Anda
// ==========================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby8XJB1vkfQxX1YmW7EeuqAxk64BldeCkOH2fxgHCCPBKmwWKcyV6Df150F6StDU8HO/exec";

// ---------------- State ----------------
let currentMode = "Masuk";
let fotoBase64 = "";
let isDrawing = false;
let hasSignature = false;

// ---------------- Elemen ----------------
const tabBtns = document.querySelectorAll(".tab-btn");
const form = document.getElementById("attendanceForm");
const namaInput = document.getElementById("nama");
const errNama = document.getElementById("errNama");
const jabatanGroup = document.getElementById("jabatanGroup");
const jabatanBadge = document.getElementById("jabatanBadge");
const comboWrap = document.getElementById("comboWrap");
const comboList = document.getElementById("comboList");
const comboClear = document.getElementById("comboClear");
let selectedEmployee = null;
const fotoInput = document.getElementById("foto");
const uploadBox = document.getElementById("uploadBox");
const uploadPlaceholder = document.getElementById("uploadPlaceholder");
const previewImg = document.getElementById("previewImg");
const errFoto = document.getElementById("errFoto");
const canvas = document.getElementById("signatureCanvas");
const ctx = canvas.getContext("2d");
const resetSignBtn = document.getElementById("resetSign");
const errSign = document.getElementById("errSign");
const submitBtn = document.getElementById("submitBtn");
const submitText = document.getElementById("submitText");
const submitSpinner = document.getElementById("submitSpinner");
const toast = document.getElementById("toast");
const clockEl = document.getElementById("clock");
const loadingOverlay = document.getElementById("loadingOverlay");
let isSubmitting = false;

document.getElementById("year").textContent = new Date().getFullYear();

// ---------------- Combobox Nama (search + pilih) & Jabatan ----------------
const employees = typeof EMPLOYEES !== "undefined" ? EMPLOYEES : [];

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    text.slice(0, idx) +
    "<mark>" +
    text.slice(idx, idx + query.length) +
    "</mark>" +
    text.slice(idx + query.length)
  );
}

function renderComboList(query) {
  const q = (query || "").trim().toLowerCase();
  const filtered = q
    ? employees.filter((emp) => emp.nama.toLowerCase().includes(q))
    : employees;

  comboList.innerHTML = "";

  if (filtered.length === 0) {
    const li = document.createElement("li");
    li.className = "combo-empty";
    li.textContent = "Nama tidak ditemukan.";
    comboList.appendChild(li);
  } else {
    filtered.forEach((emp) => {
      const li = document.createElement("li");
      li.className = "combo-item";
      li.setAttribute("role", "option");
      li.innerHTML = `<span class="combo-item-nama">${highlightMatch(emp.nama, q)}</span><span class="combo-item-jabatan">${emp.jabatan}</span>`;
      li.addEventListener("click", () => selectEmployee(emp));
      comboList.appendChild(li);
    });
  }

  comboList.hidden = false;
  namaInput.setAttribute("aria-expanded", "true");
}

function selectEmployee(emp) {
  selectedEmployee = emp;
  namaInput.value = emp.nama;
  jabatanBadge.textContent = emp.jabatan;
  jabatanGroup.hidden = false;
  comboClear.hidden = false;
  comboList.hidden = true;
  namaInput.setAttribute("aria-expanded", "false");
  clearError(errNama);
}

function clearEmployeeSelection() {
  selectedEmployee = null;
  namaInput.value = "";
  jabatanGroup.hidden = true;
  jabatanBadge.textContent = "";
  comboClear.hidden = true;
}

namaInput.addEventListener("focus", () => renderComboList(namaInput.value));

namaInput.addEventListener("input", () => {
  if (selectedEmployee && namaInput.value !== selectedEmployee.nama) {
    selectedEmployee = null;
    jabatanGroup.hidden = true;
    jabatanBadge.textContent = "";
    comboClear.hidden = true;
  }
  renderComboList(namaInput.value);
});

comboClear.addEventListener("click", () => {
  clearEmployeeSelection();
  namaInput.focus();
  renderComboList("");
});

document.addEventListener("click", (e) => {
  if (!comboWrap.contains(e.target)) {
    comboList.hidden = true;
    namaInput.setAttribute("aria-expanded", "false");
  }
});

// ---------------- Jam realtime ----------------
function updateClock() {
  const now = new Date();
  const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const tanggal = now.toLocaleDateString("id-ID", opts);
  const jam = now.toLocaleTimeString("id-ID");
  clockEl.textContent = `${tanggal} — ${jam}`;
}
updateClock();
setInterval(updateClock, 1000);

// ---------------- Tab Masuk/Pulang ----------------
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
  });
});

// ---------------- Upload Foto ----------------
uploadBox.addEventListener("click", () => fotoInput.click());

fotoInput.addEventListener("change", () => {
  const file = fotoInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showError(errFoto, "File harus berupa gambar.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    fotoBase64 = e.target.result;
    previewImg.src = fotoBase64;
    previewImg.hidden = false;
    uploadPlaceholder.hidden = true;
    clearError(errFoto);
  };
  reader.readAsDataURL(file);
});

// ---------------- Tanda Tangan Canvas ----------------
function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1e293b";
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function startDraw(e) {
  isDrawing = true;
  hasSignature = true;
  const pos = getPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  e.preventDefault();
}

function draw(e) {
  if (!isDrawing) return;
  const pos = getPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  clearError(errSign);
  e.preventDefault();
}

function stopDraw() {
  isDrawing = false;
}

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDraw);
canvas.addEventListener("mouseleave", stopDraw);

canvas.addEventListener("touchstart", startDraw, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", stopDraw);

resetSignBtn.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSignature = false;
});

// ---------------- Validasi & Submit ----------------
function showError(el, msg) {
  el.textContent = msg;
}
function clearError(el) {
  el.textContent = "";
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function validateForm() {
  let valid = true;

  if (!namaInput.value.trim()) {
    showError(errNama, "Nama wajib diisi.");
    valid = false;
  } else if (!selectedEmployee || selectedEmployee.nama !== namaInput.value.trim()) {
    showError(errNama, "Pilih nama dari daftar yang tersedia.");
    valid = false;
  } else {
    clearError(errNama);
  }

  if (!fotoBase64) {
    showError(errFoto, "Foto selfie wajib diunggah.");
    valid = false;
  } else {
    clearError(errFoto);
  }

  if (!hasSignature) {
    showError(errSign, "Tanda tangan wajib dibuat.");
    valid = false;
  } else {
    clearError(errSign);
  }

  return valid;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    showToast("Mohon lengkapi data terlebih dahulu.", true);
    return;
  }

  if (SCRIPT_URL.includes("GANTI_DENGAN_DEPLOYMENT_ID_ANDA")) {
    showToast("SCRIPT_URL belum dikonfigurasi di js/script.js", true);
    return;
  }

  const signatureBase64 = canvas.toDataURL("image/png");

  const payload = {
    nama: selectedEmployee.nama,
    jabatan: selectedEmployee.jabatan,
    tipe: currentMode,
    foto: fotoBase64,
    tandaTangan: signatureBase64,
    waktu: new Date().toISOString(),
  };

  toggleLoading(true);

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.status === "success") {
      showToast(`Absen ${currentMode} berhasil disimpan!`);
      resetForm();
    } else {
      showToast(result.message || "Terjadi kesalahan saat menyimpan data.", true);
    }
  } catch (err) {
    showToast("Gagal terhubung ke server. Periksa koneksi internet Anda.", true);
  } finally {
    toggleLoading(false);
  }
});

function toggleLoading(isLoading) {
  isSubmitting = isLoading;
  submitBtn.disabled = isLoading;
  submitText.hidden = isLoading;
  submitSpinner.hidden = !isLoading;
  loadingOverlay.hidden = !isLoading;
}

window.addEventListener("beforeunload", (e) => {
  if (isSubmitting) {
    e.preventDefault();
    e.returnValue = "";
  }
});

function resetForm() {
  clearEmployeeSelection();
  fotoInput.value = "";
  fotoBase64 = "";
  previewImg.hidden = true;
  previewImg.src = "";
  uploadPlaceholder.hidden = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSignature = false;
  clearError(errNama);
  clearError(errFoto);
  clearError(errSign);
}
