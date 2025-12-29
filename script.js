// ===============================
// 🔐 CONFIG
// ===============================
// const API =
//   "https://script.google.com/macros/s/AKfycbzdvoH3o05N7Exhwth8GEHbbvuPx1PGWCU-edvAj-Rkm-n0TeCeTkrojE5thS2geH7zIg/exec";

const API = "https://script.google.com/macros/s/AKfycbwSzS7BM3kc4BGbVsIxAFVX2zPq6Fg1ucw5JbERf2tQ16E_mgn5V5GCprqBnxXKB6QTNA/exec";

// MUST match Script Properties → SECRET_TOKEN
const AUTH_TOKEN = "MY_SECRET_KEY_123";

// ===============================
// 📌 DOM ELEMENTS
// ===============================
const patientName = document.getElementById("patientName");
const age = document.getElementById("age");
const gender = document.getElementById("gender");
const phone = document.getElementById("phone");
const address = document.getElementById("address");

const diagnosis = document.getElementById("diagnosis");
const treatment = document.getElementById("treatment");

const search = document.getElementById("search");
const cases = document.getElementById("cases");
const searchStatus = document.getElementById("searchStatus");
const toast = document.getElementById("toast");
const saveBtn = document.getElementById("saveBtn");
const chiefComplaint = document.getElementById("chiefComplaint");
const duration = document.getElementById("duration");
const pqrs = document.getElementById("pqrs");
const medicalHistory = document.getElementById("medicalHistory");
const allergies = document.getElementById("allergies");
const familyHistory = document.getElementById("familyHistory");

// ===============================
// 🧠 GLOBAL CASES CACHE
// ===============================
let CASES_ARRAY = [];
let CASES_LOADED = false;
let lastAutoFilledName = null;

// ===============================
// 📄 FIELD LIST (AUTO SAVE)
// ===============================
const fields = [
  "patientName",
  "phone",
  "age",
  "gender",
  "address",
  "chiefComplaint",
  "duration",
  "pqrs",
  "causation",
  "aggravation",
  "amelioration",
  "timeModalities",
  "hunger",
  "appetite",
  "thirst",
  "desires",
  "aversions",
  "sleep",
  "dreams",
  "thermal",
  "perspiration",
  "urine",
  "stool",
  "mental",
  "medicalHistory",
  "allergies",
  "familyHistory",
  "provisional",
  "diagnosis",
  "treatment",
];

// ===============================
// 🛠 HELPERS
// ===============================
function safeLower(val) {
  return val === undefined || val === null ? "" : String(val).toLowerCase();
}

function normalizeName(val) {
  return safeLower(val).replace(/\s+/g, " ").trim();
}

function line(label, value) {
  if (!value || value.trim() === "") return "";
  return `${label}: ${value}\n`;
}

function showToast(message, type = "info", duration = 2500) {
  if (!toast) return;

  toast.innerText = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.className = "toast";
  }, duration);
}

function disablePatientName() {
  patientName.disabled = true;
  patientName.classList.add("disabled-field");
}

function enablePatientName() {
  patientName.disabled = false;
  patientName.classList.remove("disabled-field");
}

function clearPatientInfo() {
  age.value = "";
  gender.value = "";
  phone.value = "";
  address.value = "";
  chiefComplaint.value = "";
  duration.value = "";
  pqrs.value = "";
  medicalHistory.value = "";
  allergies.value = "";
  familyHistory.value = "";
}

function persistPatientInfo() {
  localStorage.setItem("case_patientName", patientName.value);
  localStorage.setItem("case_age", age.value);
  localStorage.setItem("case_gender", gender.value);
  localStorage.setItem("case_phone", phone.value);
  localStorage.setItem("case_address", address.value);
}

function fillIfEmpty(el, value) {
  if (!el.value || !el.value.trim()) {
    el.value = value || "";
  }
}

// ===============================
// 🧾 BUILD CASE TEXT
// ===============================
function buildCaseText() {
  let text = "🩺 CASE TAKING FORM\n\n";

  let s = "";
  s += line("Name", patientName.value);
  s += line("Age", age.value);
  s += line("Gender", gender.value);
  if (s) text += "I. Patient Information\n" + s + "\n";

  s = "";
  s += line("Chief Complaint", chiefComplaint.value);
  s += line("Duration", duration.value);
  s += line("PQRS", pqrs.value);
  if (s) text += "II. Chief Complaint & Symptoms\n" + s + "\n";

  s = "";
  s += line("Causation", causation.value);
  s += line("Aggravation", aggravation.value);
  s += line("Amelioration", amelioration.value);
  s += line("Time Modalities", timeModalities.value);
  if (s) text += "III. Causation & Modalities\n" + s + "\n";

  s = "";
  s += line("Hunger", hunger.value);
  s += line("Appetite", appetite.value);
  s += line("Thirst", thirst.value);
  s += line("Desires", desires.value);
  s += line("Aversions", aversions.value);
  s += line("Sleep", sleep.value);
  s += line("Dreams", dreams.value);
  if (s) text += "IV. Physical Generals\n" + s + "\n";

  if (thermal.value.trim())
    text += "V. Thermal State\n" + thermal.value + "\n\n";

  s = "";
  s += line("Perspiration", perspiration.value);
  s += line("Urine", urine.value);
  s += line("Stool", stool.value);
  if (s) text += "VI. Eliminations\n" + s + "\n";

  if (mental.value.trim())
    text += "VII. Mental Generals\n" + mental.value + "\n\n";

  s = "";
  s += line("Medical History", medicalHistory.value);
  s += line("Allergies", allergies.value);
  if (s) text += "VIII. Medical History\n" + s + "\n";

  if (familyHistory.value.trim())
    text += "IX. Family History\n" + familyHistory.value + "\n\n";

  if (provisional.value.trim())
    text += "X. Provisional Assessment\n" + provisional.value + "\n\n";

  return text.trim();
}

// ===============================
// 📋 COPY FOR CHATGPT
// ===============================
function copyCase() {
  navigator.clipboard.writeText(buildCaseText());
  showToast("Case copied for ChatGPT", "success");
}

// ===============================
// 💾 SAVE WITH AUTO RETRY (UNCHANGED)
// ===============================
let attempts = 0;
const MAX_RETRY = 3;

async function postWithRetry(payload) {
  try {
    const res = await fetch(`${API}?token=${AUTH_TOKEN}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (text !== "OK") throw new Error("No ACK");

    return true;
  } catch {
    attempts++;
    if (attempts < MAX_RETRY) {
      await new Promise((r) => setTimeout(r, 1000));
      return postWithRetry(payload);
    }
    return false;
  }
}

// ===============================
// 💾 SAVE CASE
// ===============================
async function saveCase() {
  ["patientName", "diagnosis", "treatment"].forEach((id) => {
    document.getElementById(id).classList.remove("error-field");
  });

  let hasError = false;

  if (!patientName.value.trim()) {
    patientName.classList.add("error-field");
    hasError = true;
  }
  if (!diagnosis.value.trim()) {
    diagnosis.classList.add("error-field");
    hasError = true;
  }
  if (!treatment.value.trim()) {
    treatment.classList.add("error-field");
    hasError = true;
  }

  if (hasError) {
    showToast("Please fill all mandatory fields", "error");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerText = "Saving…";

  try {
    attempts = 0;

    const success = await postWithRetry({
      name: patientName.value,
      age: age.value,
      gender: gender.value,
      phone: phone.value,
      address: address.value,

      // ✅ ADDED (new separate columns)
      chiefComplaint: chiefComplaint.value,
      duration: duration.value,
      pqrs: pqrs.value,
      medicalHistory: medicalHistory.value,
      allergies: allergies.value,
      familyHistory: familyHistory.value,

      // ✅ KEPT (unchanged)
      caseText: buildCaseText(),
      diagnosis: diagnosis.value,
      treatment: treatment.value,
    });

    if (!success) {
      showToast(`Save failed after ${MAX_RETRY} attempts`, "error");
      return;
    }

    await loadPatientNames();
    loadSearchNames();
    clearForm();

    showToast("Case saved successfully", "success");
  } catch (err) {
    console.error(err);
    showToast("Unexpected save error", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = "💾 SAVE CASE";
  }
}

// ===============================
// 🔍 LOAD PATIENT NAMES + CACHE
// ===============================
async function loadPatientNames() {
  try {
    const res = await fetch(`${API}?token=${AUTH_TOKEN}`);
    const rows = await res.json();

    CASES_ARRAY = Array.isArray(rows) ? rows : [];
    CASES_LOADED = true;

    const datalist = document.getElementById("patientNames");
    datalist.innerHTML = "";

    const seen = new Set();
    CASES_ARRAY.forEach((r) => {
      const name = safeLower(r.name);
      if (!name || seen.has(name)) return;
      seen.add(name);

      const option = document.createElement("option");
      option.value = r.name;
      datalist.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load patient names:", err);
  }
}

function loadSearchNames() {
  if (!CASES_LOADED) return;
  const datalist = document.getElementById("searchNames");
  datalist.innerHTML = "";

  const seen = new Set();
  CASES_ARRAY.forEach((r) => {
    const name = safeLower(r.name);
    if (!name || seen.has(name)) return;
    seen.add(name);

    const option = document.createElement("option");
    option.value = r.name;
    datalist.appendChild(option);
  });
}

// ===============================
// 🧠 AUTO-FILL PATIENT INFO
// ===============================
patientName.addEventListener("input", () => {
  if (!CASES_LOADED) return;

  const name = normalizeName(patientName.value);

  // If empty → reset everything
  if (!name) {
    clearPatientInfo();
    lastAutoFilledName = null;
    return;
  }

  const matches = CASES_ARRAY.filter(
    (r) => normalizeName(r.name) === name
  ).sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

  // ❌ No exact match → clear stale data
  if (!matches.length) {
    if (lastAutoFilledName !== null) {
      clearPatientInfo();
      lastAutoFilledName = null;
    }
    return;
  }

  const r = matches[0];

  // ✅ Exact match → fill ONCE
  if (lastAutoFilledName !== name) {
    fillIfEmpty(age, r.age);
    fillIfEmpty(gender, r.gender);
    fillIfEmpty(phone, r.phone);
    fillIfEmpty(address, r.address);
    fillIfEmpty(chiefComplaint, r.chiefComplaint);
    fillIfEmpty(duration, r.duration);
    fillIfEmpty(pqrs, r.pqrs);
    fillIfEmpty(medicalHistory, r.medicalHistory);
    fillIfEmpty(allergies, r.allergies);
    fillIfEmpty(familyHistory, r.familyHistory);

    showToast("Patient details loaded", "info");
    lastAutoFilledName = name;
  }
});

patientName.addEventListener("blur", () => {
  if (!CASES_LOADED) return;

  const name = normalizeName(patientName.value);
  if (!name) return;

  const exists = CASES_ARRAY.some((r) => normalizeName(r.name) === name);

  if (exists) {
    disablePatientName();
  }
});

function restorePatientFromName() {
  if (!CASES_LOADED) return;

  const name = normalizeName(patientName.value);
  if (!name) return;

  const matches = CASES_ARRAY.filter(
    (r) => normalizeName(r.name) === name
  ).sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

  if (!matches.length) return;

  const r = matches[0];

  fillIfEmpty(age, r.age);
  fillIfEmpty(gender, r.gender);
  fillIfEmpty(phone, r.phone);
  fillIfEmpty(address, r.address);
  fillIfEmpty(chiefComplaint, r.chiefComplaint);
  fillIfEmpty(duration, r.duration);
  fillIfEmpty(pqrs, r.pqrs);
  fillIfEmpty(medicalHistory, r.medicalHistory);
  fillIfEmpty(allergies, r.allergies);
  fillIfEmpty(familyHistory, r.familyHistory);
  lastAutoFilledName = name;
  disablePatientName();
}

// ===============================
// 🔎 SEARCH CASES (FULL UI)
// ===============================
let searchTimer;

search.onkeyup = () => {
  clearTimeout(searchTimer);

  // const q = normalizeName(search.value);
  const rawQ = search.value.trim();
  const q = normalizeName(rawQ);
  const qPhone = rawQ.replace(/\D/g, "");

  if (!q) {
    cases.innerHTML = "";
    searchStatus.innerText = "";
    return;
  }

  searchStatus.innerText = "Searching…";

  searchTimer = setTimeout(() => {
    const exact = [];
    const ends = [];
    const contains = [];
    CASES_ARRAY.forEach((r) => {
      const name = normalizeName(r.name);
      const phone = (r.phone || "").replace(/\D/g, "");

      // ✅ Exact name OR exact phone
      if (name === q || (qPhone && phone === qPhone)) {
        exact.push(r);
      }
      // ✅ Partial phone match
      else if (qPhone && phone.includes(qPhone)) {
        ends.push(r);
      }
      // ✅ Partial name match
      else if (name.includes(q)) {
        contains.push(r);
      }
    });

    // Sort each group by latest visit
    const sortLatest = (a, b) => new Date(b.lastVisit) - new Date(a.lastVisit);

    exact.sort(sortLatest);
    ends.sort(sortLatest);
    contains.sort(sortLatest);

    // Final priority order
    const rows = [...exact, ...ends, ...contains];

    cases.innerHTML = "";

    rows.slice(0, 5).forEach((r) => {
      cases.innerHTML += `
<div class="card">
  <div style="font-weight:bold;">Sr No: ${r.srNo}</div>
  <div><b>${r.name}</b></div>
  <div style="font-size:13px;color:#555;">📍 ${r.address || ""}</div>
  <div style="margin-top:4px;font-size:13px;">📞 ${r.phone}</div>
  <div style="margin:6px 0;font-size:13px;">
    🕒 Last Visit: ${new Date(r.lastVisit).toLocaleString()}
  </div>

  <b>Case History:</b>
  <div class="visits">
    ${renderVisits(r.caseText, r.diagnosis, r.treatment)}
  </div>

  <br><br>
  <button onclick='openCase(${JSON.stringify(r)})'>➕ ADD New</button>
</div>`;
    });

    searchStatus.innerText = rows.length
      ? `Showing ${Math.min(5, rows.length)} result(s)`
      : "No results";
  }, 300);
};

// ===============================
// 📂 VISIT RENDERING
// ===============================
function renderVisits(caseText, diagnosisText, treatmentText) {
  if (!caseText && !diagnosisText && !treatmentText) return "<i>No visits</i>";

  const split = (t) => (t || "").split(/--- VISIT /).filter((v) => v.trim());
  const casesArr = split(caseText);
  const diagnosesArr = split(diagnosisText);
  const treatmentsArr = split(treatmentText);

  const max = Math.max(
    casesArr.length,
    diagnosesArr.length,
    treatmentsArr.length
  );
  let html = "";

  for (let i = max - 1; i >= 0; i--) {
    const getBody = (arr) =>
      arr[i] ? arr[i].split("---").slice(1).join("---").trim() : "";

    const title = (casesArr[i] || diagnosesArr[i] || treatmentsArr[i])
      .split("---")[0]
      .trim();

    html += `
<div class="visit">
  <div class="visit-header" onclick="toggleVisit(this)">
    🗓 ${title} ${i === max - 1 ? "(Latest)" : ""}
  </div>
  <pre class="visit-body ${i === max - 1 ? "open" : ""}">
<b>Case:</b>
${getBody(casesArr)}

<b>Diagnosis:</b>
${getBody(diagnosesArr)}

<b>Treatment:</b>
${getBody(treatmentsArr)}
  </pre>
</div>`;
  }
  return html;
}

function toggleVisit(header) {
  header.nextElementSibling.classList.toggle("open");
}

// ===============================
// ➕ OPEN CASE
// ===============================
function openCase(r) {
  patientName.value = r.name || "";
  fillIfEmpty(age, r.age);
  fillIfEmpty(gender, r.gender);
  fillIfEmpty(phone, r.phone);
  fillIfEmpty(address, r.address);
  fillIfEmpty(chiefComplaint, r.chiefComplaint);
  fillIfEmpty(duration, r.duration);
  fillIfEmpty(pqrs, r.pqrs);
  fillIfEmpty(medicalHistory, r.medicalHistory);
  fillIfEmpty(allergies, r.allergies);
  fillIfEmpty(familyHistory, r.familyHistory);
  diagnosis.value = "";
  treatment.value = "";

  lastAutoFilledName = normalizeName(r.name);
  disablePatientName();

  // 🔥 persist immediately (no input event happens)
  persistPatientInfo();

  showToast("Patient loaded. Add new visit & save.", "info");
}

// ===============================
// 💾 LOCAL STORAGE (AUTO SAVE)
// ===============================
fields.forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener("input", (e) => {
    // ✅ Only save REAL user typing, not autofill / restore
    if (!e.isTrusted) return;

    localStorage.setItem("case_" + id, el.value);
  });
});

window.addEventListener("load", async () => {
  fields.forEach((id) => {
    const el = document.getElementById(id);
    const saved = localStorage.getItem("case_" + id);
    if (el && saved !== null) el.value = saved;
  });

  await loadPatientNames();
  loadSearchNames();

  // 🔥 restore patient details if name exists
  restorePatientFromName();
});

// ===============================
// 🧹 CLEAR FORM
// ===============================
function clearForm() {
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
    localStorage.removeItem("case_" + id);
  });

  lastAutoFilledName = null;
  enablePatientName();
  showToast("Form cleared", "info");
}

function clearTreatmentForm() {
  diagnosis.value = "";
  treatment.value = "";

  // 🔥 remove from localStorage as well
  localStorage.removeItem("case_diagnosis");
  localStorage.removeItem("case_treatment");

  showToast("Treatment cleared", "info");
}



