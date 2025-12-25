const API =
  "https://script.google.com/macros/s/AKfycbwov3HwO4Nnx9JXMr8QQAY5J43C6GncoWvalfBRPErn4MN1hInOqtc31u176ljWg8xNuA/exec";

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

  await fetch(API, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({
      name: patientName.value,
      age: age.value,
      gender: gender.value,
      phone: phone.value,
      address: address.value,
      caseText: buildCaseText(),
      diagnosis: diagnosis.value,
      treatment: treatment.value,
    }),
  });

  saveBtn.disabled = false;
  saveBtn.innerText = "💾 SAVE CASE";

  showToast("Case saved successfully", "success");
  clearForm();
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

  searchTimer = setTimeout(async () => {
    const res = await fetch(`${API}?q=${encodeURIComponent(q)}`);
    const rows = await res.json();

    cases.innerHTML = "";
    rows.slice(0, 5).forEach((r) => {
      cases.innerHTML += `
    <div class="card">
      <b>Sr No:</b> ${r.srNo}<br>
      <b>Name:</b> ${r.name}<br>
      <b>Phone:</b> ${r.phone}<br>
      <b>Date:</b> ${new Date(r.date).toLocaleString()}<br>
      <b>Address:</b> ${r.address}<br><br>

      <b>Case:</b>
      <pre>${r.caseText}</pre>

      <b>Diagnosis:</b> ${r.diagnosis || ""}<br>
      <b>Treatment:</b> ${r.treatment || ""}
    </div>
  `;
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
