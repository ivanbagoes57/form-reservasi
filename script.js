const webhookURL = "https://script.google.com/macros/s/AKfycbx0hp6eIUY8xLxi0fEY_mX1LQK43OwuW3b-2kucLHj6a6nsceRMES4Sy2I8S-o5AEzsBg/exec";

document.addEventListener("DOMContentLoaded", () => {
    // Elemen yang DIHARAPKAN ADA di HTML:
    // - radio name="penghuni" (value: "ya"/"tidak")
    // - formPenghuni, formNonPenghuni, formAktivitas, formSenam, grupSenam, jadwalContainer, formUmum, kegiatanLain
    // - select#jamMulai, select#jamSelesai, input[name="tanggal"] (untuk non-senam)
    // - form#reservasiForm, button#btnSubmit

    const penghuniInputs = document.querySelectorAll('input[name="penghuni"]');
    const formPenghuni = document.getElementById("formPenghuni");
    const formNonPenghuni = document.getElementById("formNonPenghuni");
    const formAktivitas = document.getElementById("formAktivitas");
    const formSenam = document.getElementById("formSenam");
    const grupSenam = document.getElementById("grupSenam");
    const jadwalContainer = document.getElementById("jadwalContainer");
    const formUmum = document.getElementById("formUmum");
    const kegiatanLain = document.getElementById("kegiatanLain");
    const jamMulai = document.getElementById("jamMulai");
    const jamSelesai = document.getElementById("jamSelesai");
    const reservasiForm = document.getElementById("reservasiForm");
    const btnSubmit = document.getElementById("btnSubmit");

    // generate jam 30 menit
    for (let h = 6; h <= 22; h++) {
        for (let m of ["00", "30"]) {
            const t = `${String(h).padStart(2, "0")}:${m}`;
            jamMulai.innerHTML += `<option value="${t}">${t}</option>`;
            jamSelesai.innerHTML += `<option value="${t}">${t}</option>`;
        }
    }

    // helpers
    const hideAll = () => {
        [formPenghuni, formNonPenghuni, formAktivitas, formSenam, formUmum, kegiatanLain].forEach(el => el.classList.add("hidden"));
        jadwalContainer.innerHTML = "";
        updateFormState();
        validateForm();
    };
    const clearInputs = (element) => {
        if (!element) return;
        element.querySelectorAll("input, select, textarea").forEach(i => {
            if (i.type === "radio" || i.type === "checkbox") i.checked = false;
            else i.value = "";
        });
    };
    function updateFormState() {
        document.querySelectorAll("#reservasiForm input, #reservasiForm select, #reservasiForm textarea").forEach(i => {
            const hiddenParent = i.closest(".hidden");
            i.disabled = hiddenParent !== null;
        });
    }

    function validateForm() {
        let ok = true;
        const aktivitasChecked = (reservasiForm.querySelector('input[name="aktivitas"]:checked') || {}).value;
        const penghuniVal = (reservasiForm.querySelector('input[name="penghuni"]:checked') || {}).value;

        if (!penghuniVal) ok = false;
        if (penghuniVal === "ya") {
            ["nama_penghuni", "unit_penghuni", "wa_penghuni"].forEach(n => {
                const el = reservasiForm.querySelector(`[name="${n}"]`);
                if (!el || !el.value.trim()) ok = false;
            });
        } else if (penghuniVal === "tidak") {
            ["nama_non", "wa_non"].forEach(n => {
                const el = reservasiForm.querySelector(`[name="${n}"]`);
                if (!el || !el.value.trim()) ok = false;
            });
        }

        if (!aktivitasChecked) ok = false;
        if (aktivitasChecked === "senam") {
            const checked = reservasiForm.querySelectorAll('input[name="hari_senam"]:checked');
            if (checked.length === 0) ok = false;
        } else if (aktivitasChecked) {
            const tanggal = reservasiForm.querySelector('input[name="tanggal"]');
            if (!tanggal?.value) ok = false;
            if (!jamMulai?.value || !jamSelesai?.value) ok = false;
        }

        btnSubmit.disabled = !ok;
    }

    // penghuni/non
    penghuniInputs.forEach(input => {
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

    // aktifkan form aktivitas setelah identitas lengkap
    document.querySelectorAll("#formPenghuni input, #formNonPenghuni input").forEach(inp => {
        inp.addEventListener("input", () => {
            const activeForm = document.querySelector('input[name="penghuni"]:checked');
            if (
                activeForm?.value === "ya" &&
                [...formPenghuni.querySelectorAll("input")].every(f => f.value.trim() !== "")
            ) formAktivitas.classList.remove("hidden");
            else if (
                activeForm?.value === "tidak" &&
                [...formNonPenghuni.querySelectorAll("input")].every(f => f.value.trim() !== "")
            ) formAktivitas.classList.remove("hidden");
            updateFormState();
            validateForm();
        });
    });

    // aktivitas switch
    document.querySelectorAll('input[name="aktivitas"]').forEach(a => {
        a.addEventListener("change", () => {
            formSenam.classList.add("hidden");
            formUmum.classList.add("hidden");
            kegiatanLain.classList.add("hidden");
            jadwalContainer.innerHTML = "";
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

    // kuota senam (tabel)
    grupSenam.addEventListener("change", async () => {
        const g = grupSenam.value;
        jadwalContainer.innerHTML = "<p>Mengambil data kuota...</p>";

        try {
            const res = await fetch(webhookURL);
            const counts = await res.json();
            const maxKuota = 10;

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

            let html = `
        <p><b>Pilih Hari (maks 10 orang per jadwal):</b></p>
        <table>
          <tr><th></th><th>Hari & Waktu</th><th>Kuota</th></tr>
      `;
            jadwalList.forEach(j => {
                const jumlah = counts[j.hari] || 0;
                const full = jumlah >= maxKuota;
                html += `
          <tr class="${full ? 'disabled' : ''}">
            <td><input type="checkbox" name="hari_senam" value="${j.hari}" ${full ? 'disabled' : ''}></td>
            <td>${j.hari} (${j.jam})</td>
            <td>${full ? '<span class="full-tag">Penuh</span>' : `<small>${jumlah}/10</small>`}</td>
          </tr>
        `;
            });
            html += `
        </table>
        <label class="bookAll" style="margin-top:10px; display:flex; align-items:center; gap:8px;">
          <input type="checkbox" name="full_month" value="true">
          Booking untuk semua minggu (sesuai aturan)
        </label>
      `;
            jadwalContainer.innerHTML = html;
        } catch (err) {
            jadwalContainer.innerHTML = "<p style='color:red'>Gagal mengambil kuota 😭</p>";
            console.error(err);
        }

        updateFormState();
        validateForm();
    });

    // VALIDATOR live
    reservasiForm.addEventListener("input", validateForm);

    // SUBMIT
    reservasiForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (btnSubmit.disabled) return;

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

        // --- SENAM: aturan full-book yang kamu minta ---
        if (data.aktivitas === "senam") {
            const dayMap = {
                "Minggu": 0, "Senin": 1, "Selasa": 2, "Rabu": 3,
                "Kamis": 4, "Jumat": 5, "Sabtu": 6
            };
            const hariDipilih = Array.isArray(data.hari_senam) ? data.hari_senam : (data.hari_senam ? [data.hari_senam] : []);
            const fullMonthChecked = Array.isArray(data.full_month) ? data.full_month.includes("true") : (data.full_month === "true");

            const now = new Date();
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();

            const nextOccurrence = (weekday) => {
                const target = new Date(now);
                const targetDow = dayMap[weekday];
                while (target.getDay() !== targetDow) target.setDate(target.getDate() + 1);
                return target;
            };
            const allWeekdaysInMonth = (year, month, weekday) => {
                const res = [];
                const d = new Date(year, month, 1);
                const targetDow = dayMap[weekday];
                while (d.getDay() !== targetDow) d.setDate(d.getDate() + 1);
                while (d.getMonth() === month) {
                    res.push(new Date(d));
                    d.setDate(d.getDate() + 7);
                }
                return res;
            };

            const tanggalList = [];
            for (const h of hariDipilih) {
                const first = nextOccurrence(h);
                if (fullMonthChecked) {
                    if (first.getMonth() === thisMonth && first.getFullYear() === thisYear) {
                        // masih bulan ini => hanya 1 tanggal (occurrence berikutnya)
                        tanggalList.push(first.toISOString().split("T")[0]);
                    } else {
                        // sudah loncat ke bulan depan => ambil semua weekday tsb di bulan depan
                        const nextMonthDate = new Date(thisYear, thisMonth + 1, 1);
                        const year = nextMonthDate.getFullYear();
                        const month = nextMonthDate.getMonth();
                        const alls = allWeekdaysInMonth(year, month, h);
                        alls.forEach(dt => tanggalList.push(dt.toISOString().split("T")[0]));
                    }
                } else {
                    tanggalList.push(first.toISOString().split("T")[0]);
                }
            }
            data.tanggal = [...new Set(tanggalList)].join(", ");
            data.jam_mulai = "10:00";
            data.jam_selesai = "11:30";
        }

        // --- Non-senam: pre-check kuota/overlap ---
        if (data.aktivitas && data.aktivitas !== "senam") {
            const q = new URLSearchParams({
                check: "kuota",
                aktivitas: data.aktivitas,
                tanggal: (data.tanggal || "").split(",")[0]?.trim() || "",
                jam_mulai: data.jam_mulai || "",
                jam_selesai: data.jam_selesai || "",
                jumlah_peserta: data.jumlah_peserta || "1"
            }).toString();
            try {
                const pre = await fetch(`${webhookURL}?${q}`);
                const info = await pre.json();
                if (info.status === "full") {
                    alert(`Slot penuh. Kapasitas: ${info.cap}. Sudah terdaftar: ${info.current}.`);
                    return;
                }
                if (info.status === "booked") {
                    alert(`Slot ini sudah di-booking orang lain. Pilih tanggal/jam lain ya.`);
                    return;
                }
                if (info.status === "too_many") {
                    alert(`Maksimal peserta ${info.cap} orang untuk aktivitas ini.`);
                    return;
                }
            } catch (err) {
                alert("Gagal cek kuota. Coba lagi.");
                return;
            }
        }

        // --- Loading state anti double click ---
        btnSubmit.disabled = true;
        const prevText = btnSubmit.textContent;
        btnSubmit.textContent = "Mengirim...";
        btnSubmit.classList.add("loading");

        try {
            // console.log("DATA KIRIM:", data);
            console.log("== PAYLOAD POST ==");
            console.log(data);
            console.log("JSON:", JSON.stringify(data));
            const res = await fetch(webhookURL, { method: "POST", body: JSON.stringify(data) });
            const result = await res.json();
            if (result.error) {
                if (result.error === "full") {
                    alert(`Slot penuh. Kapasitas: ${result.cap}. Sudah terdaftar: ${result.current}.`);
                } else if (result.error === "booked") {
                    alert("Slot ini sudah di-booking orang lain.");
                } else if (result.error === "too_many") {
                    alert(`Maksimal peserta ${result.cap} orang.`);
                } else {
                    alert("Gagal menyimpan: " + result.error);
                }
                return;
            }
            alert(result.message || "Reservasi berhasil dikirim!");
            e.target.reset();
            hideAll();
        } catch (err) {
            alert("Gagal mengirim data. Cek koneksi atau webhook.");
            console.error(err);
        } finally {
            btnSubmit.textContent = prevText;
            btnSubmit.classList.remove("loading");
            validateForm(); // re-enable jika form valid
        }
    });

    hideAll();
    validateForm();
});
