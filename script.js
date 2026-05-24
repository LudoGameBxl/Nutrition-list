let nutritionData = [];
let filteredData = [];
let visibleColumns = [];
let sortColumn = null;
let sortDirection = "asc";
let editingIndex = -1;

const allColumns = [
  { key: "Aliments", label: "Aliments", type: "text" },
  { key: "Fer (mg)", label: "Fer (mg)", type: "number" },
  { key: "Vit. A (µg RAE)", label: "Vit. A (µg RAE)", type: "number" },
  { key: "Vit. B9 (µg)", label: "Vit. B9 (µg)", type: "number" },
  { key: "Vit. C (mg)", label: "Vit. C (mg)", type: "number" },
  { key: "Oméga-3 (g)", label: "Oméga-3 (g)", type: "number" },
  { key: "Oméga-6 (g)", label: "Oméga-6 (g)", type: "number" },
  { key: "Fibres (g)", label: "Fibres (g)", type: "number" },
  { key: "Magnésium (mg)", label: "Magnésium (mg)", type: "number" },
  { key: "Calcium (mg)", label: "Calcium (mg)", type: "number" },
  { key: "Potassium (mg)", label: "Potassium (mg)", type: "number" },
  { key: "Sélénium (µg)", label: "Sélénium (µg)", type: "number" },
  { key: "Glucides (g)", label: "Glucides (g)", type: "number" },
  { key: "Lipides (g)", label: "Lipides (g)", type: "number" },
  { key: "Protéines (g)", label: "Protéines (g)", type: "number" },
  { key: "Kcal", label: "Kcal", type: "number" },
  { key: "Polyphénols (mg)", label: "Polyphénols (mg)", type: "number" },
  { key: "Inuline (g)", label: "Inuline (g)", type: "number" },
  {
    key: "Acide chlorogénique (mg)",
    label: "Acide chlorogénique (mg)",
    type: "number",
  },
  { key: "Effet fer", label: "Effet sur le fer", type: "text" },
  {
    key: "Effet intestins",
    label: "Effet sur les intestins",
    type: "text",
  },
  { key: "Foie", label: "Foie (/10)", type: "score" },
  { key: "Cœur", label: "Cœur (/10)", type: "score" },
  { key: "Intestins", label: "Intestins (/10)", type: "score" },
];

document.addEventListener("DOMContentLoaded", async () => {
  visibleColumns = allColumns.map((c) =>  {
    if(["Aliments", "Foie", "Cœur", "Intestins"].includes( c.key)){
        return c.key
    }
  });
  await loadData();
  renderTable();
  setupEventListeners();
});

async function loadData() {
  try {
    const response = await fetch("data.json");
    nutritionData = await response.json();
    filteredData = [...nutritionData];
  } catch (e) {
    console.error("Erreur chargement data.json:", e);
    nutritionData = [];
    filteredData = [];
  }
}

function setupEventListeners() {
  document
    .getElementById("searchInput")
    .addEventListener("input", handleSearch);
  document
    .getElementById("columnToggleBtn")
    .addEventListener("click", toggleColumnDropdown);
  document
    .getElementById("printBtn")
    .addEventListener("click", () => window.print());
  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("columnDropdown");
    const btn = document.getElementById("columnToggleBtn");
    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    filteredData = [...nutritionData];
  } else {
    filteredData = nutritionData.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(query),
      ),
    );
  }
  if (sortColumn) applySorting();
  renderTable();
}

function toggleColumnDropdown() {
  document.getElementById("columnDropdown").classList.toggle("open");
}

function selectAllColumns() {
  document
    .querySelectorAll('#columnDropdown input[type="checkbox"]')
    .forEach((cb) => (cb.checked = true));
  visibleColumns = allColumns.map((c) => c.key);
  renderTable();
}

function deselectAllColumns() {
  document
    .querySelectorAll('#columnDropdown input[type="checkbox"]')
    .forEach((cb) => (cb.checked = false));
  visibleColumns = ["Aliments"];
  document.querySelector('#columnDropdown input[value="Aliments"]').checked =
    true;
  renderTable();
}

function handleColumnChange(key, checked) {
  if (checked) {
    if (!visibleColumns.includes(key)) visibleColumns.push(key);
  } else {
    visibleColumns = visibleColumns.filter((k) => k !== key);
    if (visibleColumns.length === 0) visibleColumns.push("Aliments");
  }
  renderTable();
}

function renderTable() {
  const cols = allColumns.filter((c) => visibleColumns.includes(c.key));

  // Column dropdown
  const dropdown = document.getElementById("columnDropdown");
  let dropdownHTML = "";
  allColumns.forEach((col) => {
    const checked = visibleColumns.includes(col.key) ? "checked" : "";
    const disabled = col.key === "Aliments" ? "disabled" : "";
    dropdownHTML += `<label><input type="checkbox" value="${col.key}" ${checked} ${disabled} onchange="handleColumnChange('${col.key}', this.checked)"> ${col.label}</label>`;
  });
  dropdownHTML += `<div class="dropdown-actions"><button onclick="selectAllColumns()">Tout</button><button onclick="deselectAllColumns()">Aucune</button></div>`;
  dropdown.innerHTML = dropdownHTML;

  // Table
  const container = document.getElementById("tableContainer");
  let html = "<table><thead><tr>";
  cols.forEach((col) => {
    const sorted = sortColumn === col.key;
    const icon = sorted ? (sortDirection === "asc" ? "↑" : "↓") : "↕";
    html += `<th class="${sorted ? "sorted" : ""}" onclick="sortBy('${col.key}')">${col.label} <span class="sort-icon">${icon}</span></th>`;
  });
  html += '</tr></thead><tbody>';

  filteredData.forEach((row, idx) => {
    html += "<tr>";
    cols.forEach((col) => {
      const val = row[col.key] ?? "";
      if (col.type === "score" && val !== "") {
        const numVal = Number(val);
        const cls =
          numVal >= 7 ? "score-high" : numVal >= 4 ? "score-mid" : "score-low";
        html += `<td><span class="score-badge ${cls}">${numVal}</span></td>`;
      } else if (col.key === "Aliments") {
        html += `<td class="aliment-name">${val}</td>`;
      } else {
        html += `<td>${val}</td>`;
      }
    });
    const realIdx = nutritionData.indexOf(row);

  });

  html += "</tbody></table>";
  container.innerHTML = html;
  document.getElementById("rowCount").textContent =
    `${filteredData.length} aliment${filteredData.length > 1 ? "s" : ""} affiché${filteredData.length > 1 ? "s" : ""} sur ${nutritionData.length}`;
}

function sortBy(key) {
  if (sortColumn === key) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    sortColumn = key;
    sortDirection = "asc";
  }
  applySorting();
  renderTable();
}

function applySorting() {
  filteredData.sort((a, b) => {
    let valA = a[sortColumn] ?? "";
    let valB = b[sortColumn] ?? "";
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB) && valA !== "" && valB !== "") {
      return sortDirection === "asc" ? numA - numB : numB - numA;
    }
    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();
    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
}

function openModal(index = -1) {
  editingIndex = index;
  const modal = document.getElementById("modalOverlay");
  const title = document.getElementById("modalTitle");
  const form = document.getElementById("modalForm");

  title.textContent = index >= 0 ? "Modifier l'aliment" : "Ajouter un aliment";

  let formHTML = '<div class="form-grid">';
  allColumns.forEach((col) => {
    const val = index >= 0 ? (nutritionData[index][col.key] ?? "") : "";
    const isFullWidth = col.type === "text" && col.key !== "Aliments";
    formHTML += `<div class="form-group ${isFullWidth ? "full-width" : ""}">
      <label>${col.label}</label>
      <input type="${col.type === "score" ? "number" : col.type === "number" ? "text" : "text"}" 
             data-key="${col.key}" 
             value="${String(val).replace(/"/g, "&quot;")}" 
             ${col.type === "score" ? 'min="0" max="10"' : ""}
             placeholder="${col.label}">
    </div>`;
  });
  formHTML += "</div>";
  form.innerHTML = formHTML;

  modal.classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  editingIndex = -1;
}

function saveEntry() {
  const inputs = document.querySelectorAll("#modalForm input");
  const entry = {};
  inputs.forEach((input) => {
    const key = input.dataset.key;
    const col = allColumns.find((c) => c.key === key);
    let val = input.value.trim();
    if (col.type === "number" || col.type === "score") {
      entry[key] = val === "" ? "" : val;
    } else {
      entry[key] = val;
    }
  });

  if (!entry["Aliments"]) {
    alert("Le nom de l'aliment est obligatoire.");
    return;
  }

  if (editingIndex >= 0) {
    nutritionData[editingIndex] = entry;
  } else {
    nutritionData.push(entry);
  }

  handleSearch({ target: document.getElementById("searchInput") });
  closeModal();
}

function deleteEntry(index) {
  const name = nutritionData[index]["Aliments"];
  if (confirm(`Supprimer "${name}" ?`)) {
    nutritionData.splice(index, 1);
    handleSearch({ target: document.getElementById("searchInput") });
  }
}
