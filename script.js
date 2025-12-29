const API =
  "https://script.google.com/macros/s/AKfycbyFJOj7CxTEOf9LD7nMn73bPqGsVOW5-JWVlEa_eSyrB_ykvDSJpH8JYFBqKUUlfRdmMQ/exec";

const API_KEY = "MY_SECRET_KEY_123";

const patientName = document.getElementById("patientName");
const age = document.getElementById("age");
const gender = document.getElementById("gender");
const phone = document.getElementById("phone");
const address = document.getElementById("address");

/* =========================
   GLOBAL CASES CACHE (IN-MEMORY)
========================= */
let CASES_ARRAY = [];
let CASES_LOADED = false;

/* =========================
   FIELD LIST (FOR STORAGE)
========================= */
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

/* =========================
   HELPERS
========================= */
function line(label, value) {
  if (!value || value.trim() === "") return "";
  return `${label}: ${value}\n`;
}

function safeLower(val) {
  return val === undefined || val === null ? "" : String(val).toLowerCase();
}

function normalizeName(val) {
  return String(val || "")
    .toLowerCase()
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();
}

// patientName.addEventListener("input", async () => {
//   const name = patientName.value.trim();
//   if (!name) return;

//   try {
//     const res = await fetch(
//       `${API}?key=${API_KEY}&q=${encodeURIComponent(name)}`
//     );
//     const rows = await res.json();

//     if (!Array.isArray(rows) || !rows.length) return;

//     const r = rows[0]; // latest visit

//     age.value = r.age || "";
//     gender.value = r.gender || "";
//     phone.value = r.phone || "";
//     address.value = r.address || "";

//     showToast("Patient details loaded", "info");
//   } catch (err) {
//     console.error("Patient auto-fill failed:", err);
//   }
// });

patientName.addEventListener("input", () => {
  if (!CASES_LOADED) return;

  const name = patientName.value.trim().toLowerCase();
  if (!name) return;

  // const matches = CASES_ARRAY.filter(
  //   (r) => (r.name || "").toLowerCase() === name
  // ).sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

  const matches = CASES_ARRAY.filter(
    (r) => normalizeName(r.name) === normalizeName(name)
  ).sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

  if (!matches.length) return;

  const r = matches[0]; // latest visit

  age.value = r.age || "";
  gender.value = r.gender || "";
  phone.value = r.phone || "";
  address.value = r.address || "";

  showToast("Patient details loaded", "info");
});

/* =========================
   BUILD CASE TEXT
========================= */
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

/* =========================
   COPY FOR CHATGPT
========================= */
function copyCase() {
  navigator.clipboard.writeText(buildCaseText());
  showToast("Case copied for ChatGPT", "success");
}

/* =========================
   SAVE WITH ACK + AUTO RETRY
========================= */
let attempts = 0;
const MAX_RETRY = 3;

async function postWithRetry(payload) {
  try {
    const res = await fetch(`${API}?key=${API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    // ✅ ACK from Apps Script
    if (text !== "OK") throw new Error("No ACK");

    return true;
  } catch (err) {
    attempts++;

    if (attempts < MAX_RETRY) {
      await new Promise((r) => setTimeout(r, 1000));
      return postWithRetry(payload);
    }

    return false;
  }
}

/* =========================
   SAVE CASE
========================= */
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
      caseText: buildCaseText(),
      diagnosis: diagnosis.value,
      treatment: treatment.value,
    });

    if (!success) {
      showToast(`Save failed after ${MAX_RETRY} attempts`, "error");
      return;
    }

    // 🔄 refresh in-memory array after save
    await loadPatientNames();
    loadSearchNames();

    showToast("Case saved successfully", "success");
    clearForm();
  } catch (err) {
    console.error(err);
    showToast("Unexpected save error", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = "💾 SAVE CASE";
  }
}

/* =========================
   SEARCH OLD CASES
========================= */
let searchTimer;

search.onkeyup = () => {
  clearTimeout(searchTimer);

  const q = search.value.trim();
  if (!q) {
    cases.innerHTML = "";
    searchStatus.innerText = "";
    return;
  }

  searchStatus.innerText = "Searching…";

  searchTimer = setTimeout(() => {
    if (!CASES_LOADED) return;

    // const ql = q.toLowerCase();
    const ql = normalizeName(q);

    // const rows = CASES_ARRAY.filter((r) => {
    //   return safeLower(r.name).includes(ql) || safeLower(r.phone).includes(q);
    // }).sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

    const exact = [];
    const partial = [];

    CASES_ARRAY.forEach((r) => {
      // const name = safeLower(r.name);
      const name = normalizeName(r.name);

      if (name === ql) {
        exact.push(r);
      } else if (name.includes(ql)) {
        partial.push(r);
      }
    });

    // sort each group by latest visit
    exact.sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));
    partial.sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

    // exact first, then partial
    const rows = [...exact, ...partial];

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

/* =========================
   LOCAL STORAGE (AUTO SAVE)
========================= */
fields.forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener("input", () => {
    localStorage.setItem("case_" + id, el.value);
  });
});

/* =========================
   RESTORE ON LOAD
========================= */
window.addEventListener("load", () => {
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const saved = localStorage.getItem("case_" + id);
    if (saved !== null) el.value = saved;
  });
});

/* =========================
   CLEAR FORM
========================= */
function clearForm() {
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.value = "";
    localStorage.removeItem("case_" + id);
  });

  showToast("Form cleared", "info");
}

function showToast(message, type = "info", duration = 2500) {
  toast.innerText = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.className = "toast";
  }, duration);
}

function toggleCase(btn) {
  const pre = btn.previousElementSibling;

  if (btn.innerText === "Read more") {
    pre.style.maxHeight = "none";
    btn.innerText = "Read less";
  } else {
    pre.style.maxHeight = "120px";
    btn.innerText = "Read more";
  }
}

function openCase(r) {
  // Basic patient info
  patientName.value = r.name || "";
  age.value = r.age || "";
  gender.value = r.gender || "";
  phone.value = r.phone || "";
  address.value = r.address || "";

  // Clear diagnosis & treatment for NEW visit
  diagnosis.value = "";
  treatment.value = "";

  showToast("Patient loaded. Add new visit & save.", "info");
}

function renderVisits(caseText, diagnosisText, treatmentText) {
  if (!caseText && !diagnosisText && !treatmentText) return "<i>No visits</i>";

  const split = (text) =>
    (text || "").split(/--- VISIT /).filter((v) => v.trim());

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
    const getBody = (arr) => {
      if (!arr[i]) return "";
      return arr[i].split("---").slice(1).join("---").trim();
    };

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
      </div>
    `;
  }

  return html;
}

function toggleVisit(header) {
  const body = header.nextElementSibling;
  body.classList.toggle("open");
}

function getLastVisitValue(text) {
  if (!text) return "";

  const parts = text.split(/--- VISIT /).filter((v) => v.trim());
  if (!parts.length) return "";

  const last = parts[parts.length - 1];
  let body = last.split("---").slice(1).join("---").trim();

  body = body.replace(/^(CASE|DIAGNOSIS|TREATMENT|ADDRESS):\s*/i, "");

  return body.trim();
}

// async function loadPatientNames() {
//   try {
//     const res = await fetch(`${API}?key=${API_KEY}`);
//     const rows = await res.json();
//     const datalist = document.getElementById("patientNames");
//     datalist.innerHTML = "";
//     rows.forEach((r) => {
//       const option = document.createElement("option");
//       option.value = r.name;
//       datalist.appendChild(option);
//     });
//   } catch (err) {
//     console.error("Failed to load patient names:", err);
//   }
// }

async function loadPatientNames() {
  try {
    const res = await fetch(`${API}?key=${API_KEY}`);
    const rows = await res.json();

    // 🔥 STORE FULL DATASET
    CASES_ARRAY = Array.isArray(rows) ? rows : [];
    CASES_LOADED = true;

    const datalist = document.getElementById("patientNames");
    datalist.innerHTML = "";

    // CASES_ARRAY.forEach((r) => {
    //   if (!r.name) return;
    //   const option = document.createElement("option");
    //   option.value = r.name;
    //   datalist.appendChild(option);
    // });
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

// async function loadSearchNames() {
//   try {
//     const res = await fetch(`${API}?key=${API_KEY}`);
//     const rows = await res.json();
//     const datalist = document.getElementById("searchNames");
//     datalist.innerHTML = "";
//     rows.forEach((r) => {
//       const option = document.createElement("option");
//       option.value = r.name;
//       datalist.appendChild(option);
//     });
//   } catch (err) {
//     console.error("Failed to load search names:", err);
//   }
// }

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

// window.addEventListener("load", () => {
//   loadPatientNames();
//   loadSearchNames();
// });

window.addEventListener("load", async () => {
  await loadPatientNames(); // fetch + populate array
  loadSearchNames(); // reuse same array
});
