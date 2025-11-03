// ================== CONFIG ==================
const webhookURL = "https://script.google.com/macros/s/AKfycby3laK4tFQr1aKxN8kKM4fXc3Fod9hZSVMPh6RLZG6Lk2wdIguz5xR-QU9DXNBPYP-kFQ/exec";
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  // ---------- Mini helpers ----------
  const $id = (id) => document.getElementById(id);
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Map hari ----------
  const DOW = { "Minggu":0, "Senin":1, "Selasa":2, "Rabu":3, "Kamis":4, "Jumat":5, "Sabtu":6 };
  const cloneDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const nextWeekdayFrom = (baseDate, targetDow) => {
    const d = cloneDate(baseDate);
    const delta = (targetDow + 7 - d.getDay()) % 7;
    d.setDate(d.getDate() + delta);
    return d;
  };
  const allWeekdaysInMonth = (year, monthIndex, targetDow) => {
    const res = [];
    const d = new Date(year, monthIndex, 1);
    const delta = (targetDow + 7 - d.getDay()) % 7;
    d.setDate(d.getDate() + delta);
    while (d.getMonth() === monthIndex) {
      res.push(new Date(d));
      d.setDate(d.getDate() + 7);
    }
    return res;
  };

  // ---------- Elemen DOM ----------
  const reservasiForm = $id("reservasiForm");
  const formPenghuni = $id("formPenghuni");
  const formNonPenghuni = $id("formNonPenghuni");
  const formAktivitas = $id("formAktivitas");
  const formSenam = $id("formSenam");
  const grupSenam = $id("grupSenam");
  const jadwalContainer = $id("jadwalContainer");
  const formUmum = $id("formUmum");
  const kegiatanLain = $id("kegiatanLain");
  const jamMulai = $id("jamMulai");
  const jamSelesai = $id("jamSelesai");
  const btnSubmit = $id("btnSubmit");

  // ---------- Generate jam ----------
  if (jamMulai && jamSelesai) {
    for (let h = 6; h <= 22; h++) {
      for (const m of ["00","30"]) {
        const t = `${String(h).padStart(2,"0")}:${m}`;
        jamMulai.insertAdjacentHTML("beforeend", `<option value="${t}">${t}</option>`);
        jamSelesai.insertAdjacentHTML("beforeend", `<option value="${t}">${t}</option>`);
      }
    }
  }

  // ---------- Utils UI ----------
  const clearInputs = (element) => {
    if (!element) return;
    element.querySelectorAll("input, select, textarea").forEach(i => {
      if (i.type === "radio" || i.type === "checkbox") i.checked = false;
      else i.value = "";
    });
  };

  function updateFormState() {
    $$("#reservasiForm input, #reservasiForm select, #reservasiForm textarea").forEach(i => {
      const hiddenParent = i.closest(".hidden");
      i.disabled = hiddenParent !== null;
    });
  }

  function validateForm() {
    if (!btnSubmit) return;
    let ok = true;

    const penghuniVal = ($('input[name="penghuni"]:checked', reservasiForm) || {}).value;
    const aktivitas   = ($('input[name="aktivitas"]:checked', reservasiForm) || {}).value;

    if (!penghuniVal) ok = false;
    if (penghuniVal === "ya") {
      ["nama_penghuni","unit_penghuni","wa_penghuni"].forEach(n=>{
        const el = $(`[name="${n}"]`, reservasiForm);
        if (!el || !el.value.trim()) ok = false;
      });
    } else if (penghuniVal === "tidak") {
      ["nama_non","wa_non"].forEach(n=>{
        const el = $(`[name="${n}"]`, reservasiForm);
        if (!el || !el.value.trim()) ok = false;
      });
    } else ok = false;

    if (!aktivitas) ok = false;
    if (aktivitas === "senam") {
      if ($$('input[name="hari_senam"]:checked', reservasiForm).length === 0) ok = false;
    } else if (aktivitas) {
      const tanggal = $('[name="tanggal"]', reservasiForm);
      if (!tanggal?.value) ok = false;
      if (!jamMulai?.value || !jamSelesai?.value) ok = false;
      if (jamMulai?.value && jamSelesai?.value) {
        const [h1,m1] = jamMulai.value.split(":").map(Number);
        const [h2,m2] = jamSelesai.value.split(":").map(Number);
        if (h2*60+m2 <= h1*60+m1) ok = false;
      }
    }

    btnSubmit.disabled = !ok;
  }

  const hideAll = () => {
    [formPenghuni, formNonPenghuni, formAktivitas, formSenam, formUmum, kegiatanLain]
      .filter(Boolean).forEach(el => el.classList.add("hidden"));
    if (jadwalContainer) jadwalContainer.innerHTML = "";
    updateFormState();
    validateForm();
  };

  if (!reservasiForm) return;
  hideAll();

  // ---------- Penghuni/Non ----------
  $$('input[name="penghuni"]').forEach(input => {
    input.addEventListener("change", () => {
      hideAll();
      clearInputs(formPenghuni);
      clearInputs(formNonPenghuni);
      clearInputs(formAktivitas);
      clearInputs(formSenam);
      clearInputs(formUmum);

      if (input.value === "ya") formPenghuni.classList.remove("hidden");
      else formNonPenghuni.classList.remove("hidden");

      updateFormState();
      validateForm();
    });
  });

  // ---------- Aktifkan aktivitas saat identitas lengkap ----------
  $$("#formPenghuni input, #formNonPenghuni input").forEach(inp => {
    inp.addEventListener("input", () => {
      const activeForm = $('input[name="penghuni"]:checked');
      const okPenghuni = [...(formPenghuni?.querySelectorAll("input") || [])].every(f => f.value.trim() !== "");
      const okNon = [...(formNonPenghuni?.querySelectorAll("input") || [])].every(f => f.value.trim() !== "");
      if ((activeForm?.value === "ya" && okPenghuni) || (activeForm?.value === "tidak" && okNon)) {
        formAktivitas.classList.remove("hidden");
      }
      updateFormState();
      validateForm();
    });
  });

  // ---------- Aktivitas toggle ----------
  $$('input[name="aktivitas"]').forEach(a => {
    a.addEventListener("change", () => {
      formSenam.classList.add("hidden");
      formUmum.classList.add("hidden");
      kegiatanLain.classList.add("hidden");
      if (jadwalContainer) jadwalContainer.innerHTML = "";
      clearInputs(formSenam);
      clearInputs(formUmum);

      const val = a.value;
      if (val === "senam") formSenam.classList.remove("hidden");
      else {
        formUmum.classList.remove("hidden");
        if (val === "lain-lain") kegiatanLain.classList.remove("hidden");
      }
      updateFormState();
      validateForm();
    });
  });

  // ---------- Kuota Senam (GET doGet) ----------
  if (grupSenam) {
    grupSenam.addEventListener("change", async () => {
      const g = grupSenam.value;
      if (!jadwalContainer) return;
      jadwalContainer.innerHTML = "<p>Mengambil data kuota...</p>";

      try {
        const res = await fetch(webhookURL); // doGet default -> kuota senam next occurrence
        const counts = await res.json();
        const maxKuota = counts.senamCap || 10;

        const jadwalBuLinda = [
          { hari: "Senin", jam: "10.00–11.30" },
          { hari: "Rabu", jam: "10.00–11.30" },
          { hari: "Jumat", jam: "10.00–11.30" }
        ];
        const jadwalBuRetno = [
          { hari: "Selasa", jam: "10.00–11.30" },
          { hari: "Kamis", jam: "10.00–11.30" },
          { hari: "Sabtu", jam: "10.00–11.30" }
        ];
        const jadwalList = g === "bu linda" ? jadwalBuLinda : jadwalBuRetno;

        const nextDates = counts.nextDates || {}; // kalau nanti kamu aktifkan di backend

        let html = `
          <p><b>Pilih Hari (maks ${maxKuota} orang per jadwal):</b></p>
          <table>
            <tr><th></th><th>Hari & Waktu</th><th>Kuota</th></tr>
        `;
        jadwalList.forEach(j => {
          const jumlah = counts[j.hari] || 0;
          const full = jumlah >= maxKuota;
          const labelTanggal = nextDates[j.hari] ? ` — ${nextDates[j.hari]}` : "";
          html += `
            <tr class="${full ? 'disabled' : ''}">
              <td><input type="checkbox" name="hari_senam" value="${j.hari}" ${full ? 'disabled' : ''}></td>
              <td>${j.hari} (${j.jam})<small>${labelTanggal}</small></td>
              <td>${full ? '<span class="full-tag">Penuh</span>' : `<small>${jumlah}/${maxKuota}</small>`}</td>
            </tr>
          `;
        });
        html += `
          </table>
          <label class="bookAll" style="margin-top:10px; display:flex; align-items:center; gap:8px;">
            <input type="checkbox" name="full_month" value="true">
            <span>Booking untuk semua minggu bulan ini (sesuai aturan)</span>
          </label>
        `;
        jadwalContainer.innerHTML = html;
      } catch (err) {
        console.error(err);
        jadwalContainer.innerHTML = "<p style='color:red'>Gagal mengambil kuota 😭</p>";
      }
      updateFormState();
      validateForm();
    });
  }

  // ---------- Generator tanggal SENAM ----------
  function generateSenamTanggal(hariSelected, fullMonthChecked, today = new Date()) {
    const out = [];
    hariSelected.forEach(hari => {
      const dow = DOW[hari];
      if (dow == null) return;

      const next = nextWeekdayFrom(today, dow);

      if (!fullMonthChecked) {
        // hanya tanggal terdekat
        out.push(toISO(next));
        return;
      }

      // FULL MONTH: semua weekday di BULAN tempat 'next' jatuh
      const Y = next.getFullYear();
      const M = next.getMonth();
      const all = allWeekdaysInMonth(Y, M, dow);
      all.forEach(d => out.push(toISO(d)));
    });

    const uniq = Array.from(new Set(out));
    uniq.sort();
    return uniq;
  }

  // ---------- POST helper (tanpa Content-Type untuk hindari preflight) ----------
  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
      redirect: "follow"
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${raw.slice(0,200)}`);
    try { return JSON.parse(raw); }
    catch { throw new Error("Server did not return JSON: " + raw.slice(0,200)); }
  }

  // ---------- Precheck non-senam ----------
  async function precheckNonSenam(aktivitas, tanggal, jm, js, jumlah) {
    const q = new URLSearchParams({
      check: "kuota",
      aktivitas,
      tanggal,
      jam_mulai: jm,
      jam_selesai: js,
      jumlah_peserta: String(jumlah || 1),
    });
    const res = await fetch(`${webhookURL}?${q.toString()}`);
    return res.json();
  }

  // ---------- Spinner helpers (selalu aktif saat submit dipencet) ----------
  const submitBtn = btnSubmit || $("#reservasiForm button[type='submit']");
  const originalBtnText = submitBtn ? submitBtn.textContent : "Kirim Reservasi";
  function startLoading(){
    if (!submitBtn) return;
    submitBtn.disabled = true;
    submitBtn.textContent = "Mengirim…";
    submitBtn.classList.add("loading");
  }
  function stopLoading(){
    if (!submitBtn) return;
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
    submitBtn.classList.remove("loading");
  }

  // ---------- Submit ----------
  reservasiForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // selalu tampilkan animasi begitu tombol dipencet
    startLoading();

    const enabledElements = Array.from(reservasiForm.elements).filter(el => !el.disabled);
    const data = {};
    enabledElements.forEach(el => {
      if (!el.name) return;
      if (el.type === "checkbox") {
        if (!data[el.name]) data[el.name] = [];
        if (el.checked) data[el.name].push(el.value);
      } else if (el.type === "radio") {
        if (el.checked) data[el.name] = el.value;
      } else {
        data[el.name] = el.value;
      }
    });

    const aktivitas = data.aktivitas;

    // Validasi dasar
    const penghuniVal = (document.querySelector('input[name="penghuni"]:checked') || {}).value;
    if (!penghuniVal) { stopLoading(); alert("Pilih penghuni / non-penghuni dulu ya."); return; }
    if (penghuniVal === "ya") {
      for (const n of ["nama_penghuni","unit_penghuni","wa_penghuni"]) {
        if (!data[n] || !String(data[n]).trim()) { stopLoading(); alert("Lengkapi data penghuni dulu, ya."); return; }
      }
    } else if (penghuniVal === "tidak") {
      for (const n of ["nama_non","wa_non"]) {
        if (!data[n] || !String(data[n]).trim()) { stopLoading(); alert("Lengkapi data non-penghuni dulu, ya."); return; }
      }
    }
    if (!aktivitas) { stopLoading(); alert("Pilih aktivitas dulu, hmph!"); return; }

    // === SENAM ===
    if (aktivitas === "senam") {
      const hariDipilih = Array.isArray(data.hari_senam) ? data.hari_senam : (data.hari_senam ? [data.hari_senam] : []);
      const fullMonthChecked = data.full_month && data.full_month.includes("true");

      if (fullMonthChecked && hariDipilih.length === 0) {
        stopLoading();
        alert("Pilih minimal satu hari senam sebelum centang booking sebulan.");
        return;
      }

      const today = new Date();
      const tanggalList = generateSenamTanggal(hariDipilih, !!fullMonthChecked, today);
      if (tanggalList.length === 0) { stopLoading(); alert("Tidak ada tanggal valid untuk pilihanmu."); return; }

      data.tanggal = tanggalList.join(", ");
      data.jam_mulai = "10:00";
      data.jam_selesai = "11:30";
    }

    // === NON-SENAM ===
    if (aktivitas !== "senam") {
      const jm = data.jam_mulai;
      const js = data.jam_selesai;
      const tanggal = data.tanggal;

      if (!tanggal || !jm || !js) { stopLoading(); alert("Tanggal dan jam harus diisi."); return; }
      const [h1,m1] = jm.split(":").map(Number);
      const [h2,m2] = js.split(":").map(Number);
      if (h2*60+m2 <= h1*60+m1) { stopLoading(); alert("Jam selesai harus lebih besar dari jam mulai."); return; }

      // Precheck kuota/overlap → spinner tetap ON; kalau fail, matikan lalu keluarin alasan
      try {
        const pc = await precheckNonSenam(aktivitas, tanggal, jm, js, data.jumlah_peserta || 1);
        if (pc.status === "full") {
          const cap = pc.cap != null ? pc.cap : (aktivitas === "tenis" ? 4 : (aktivitas === "tenis meja" ? 8 : 30));
          const cur = pc.current != null ? pc.current : cap;
          stopLoading();
          alert(`Kuota penuh untuk ${aktivitas} pada ${tanggal} ${jm}–${js}.\nMaks ${cap} orang per satu waktu. Saat ini ${cur}/${cap}.`);
          return;
        }
        if (pc.status === "booked") {
          stopLoading();
          alert(`Jadwal ${tanggal} ${jm}–${js} sudah dibooking untuk ${aktivitas}. Pilih jam/tanggal lain ya.`);
          return;
        }
        if (pc.status === "too_many") {
          const cap2 = pc.cap != null ? pc.cap : 30;
          stopLoading();
          alert(`Jumlah peserta melebihi kapasitas (maks ${cap2} orang).`);
          return;
        }
      } catch (err) {
        console.warn("Precheck gagal, lanjut kirim...", err);
      }
    }

    // ==== Kirim (POST) ====
    try {
      const result = await postJSON(webhookURL, data);
      alert(result.message || "Reservasi berhasil dikirim!");
      e.target.reset();
      hideAll();
      updateFormState();
      validateForm();
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim data: " + err.message);
    } finally {
      stopLoading();
    }
  });

  reservasiForm.addEventListener("input", validateForm);
  validateForm();
});
