let nutritionData = [];
let filteredData = [];
let visibleColumns = [];
let sortColumn = null;
let sortDirection = "asc";
let editingId = null; // id SQLite de l'aliment en cours d'édition (null = ajout)
let editMode = false; // affiche/masque les outils d'édition
let db = null; // base SQLite chargée en mémoire (sql.js)

const allColumns = [
  { key: "Aliments", label: "Aliments", type: "text" },
  { key: "Catégorie", label: "Catégorie", type: "text" },
  { key: "Fréquence", label: "Fréquence", type: "text" },
  { key: "Portion idéale", label: "Portion idéale", type: "text" },
  { key: "Portion acceptable", label: "Portion acceptable", type: "text" },
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
  {
    key: "Anti-inflammatoire",
    label: "Anti-inflammatoire (/10)",
    type: "score",
  },
  { key: "Anti-hépatite B", label: "Anti-hépatite B (/10)", type: "score" },
  { key: "Score global", label: "Score global (/10)", type: "score" },

  {
    key: "Mode de cuisson privilégié",
    label: "Mode de cuisson privilégié",
    type: "text",
  },
  { key: "Notes spécifiques", label: "Notes spécifiques", type: "text" },

  // { key: "J-1", label: "J-1 (veille)", type: "score" },
  // { key: "J0", label: "J 0", type: "score" },
  // { key: "J+1", label: "J+1", type: "score" },
  // { key: "J+3", label: "J+3", type: "score" },
  // { key: "J+7", label: "J+7", type: "score" },
];

document.addEventListener("DOMContentLoaded", async () => {
  visibleColumns = allColumns
    .map((c) => {
      if (
        [
          "Aliments",
          // "Fréquence",
          // "Portion idéale",
          "Oméga-3 (g)",
          "Fer (mg)",
          "Protéines (g)",
          "Foie",
          "Cœur",
          "Intestins",
          "Anti-inflammatoire",
          "Anti-hépatite B",
          // "J-1",
          // "J0",
          // "J+1",
          // "J+3",
          // "J+7",
          // "Score global"
        ].includes(c.key)
      ) {
        return c.key;
      }
    })
    .filter(Boolean);
  await loadData();
  renderTable();
  setupEventListeners();
});

async function loadData() {
  try {
    const SQL = await initSqlJs({ locateFile: (f) => `vendor/${f}` });
    const buf = await (await fetch("nutrition.db")).arrayBuffer();
    db = new SQL.Database(new Uint8Array(buf));
    reloadFromDb();
  } catch (e) {
    console.error("Erreur chargement nutrition.db:", e);
    nutritionData = [];
    filteredData = [];
  }
}

// Recharge nutritionData depuis la base et rafraîchit l'affichage.
function reloadFromDb() {
  const res = db.exec("SELECT * FROM foods ORDER BY id");
  nutritionData = rowsToObjects(res);
  filteredData = [...nutritionData];
  if (sortColumn) applySorting();
}

// Transforme le résultat sql.js ({columns, values}) en tableau d'objets,
// avec des clés identiques à celles des anciens JSON (le rendu reste inchangé).
function rowsToObjects(res) {
  if (!res || !res.length) return [];
  const { columns, values } = res[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((c, i) => {
      obj[c] = row[i];
    });
    return obj;
  });
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
  document
    .getElementById("editModeBtn")
    .addEventListener("click", toggleEditMode);
  document
    .getElementById("addBtn")
    .addEventListener("click", () => openEditModal(null));
  document.getElementById("exportBtn").addEventListener("click", exportDb);
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
    html += `<th class="${sorted ? "sorted" : ""}" onclick="sortBy('${col.key}')">${col.label} <span class="sort-icon ${sortDirection}">${icon}</span></th>`;
  });
  if (editMode) html += `<th class="actions-cell">Actions</th>`;
  html += "</tr></thead><tbody>";

  filteredData.forEach((row) => {
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
    if (editMode) {
      html += `<td class="actions-cell"><button class="btn-icon" title="Modifier" onclick="openEditModal(${row.id})">✏️</button><button class="btn-icon" title="Supprimer" onclick="deleteFood(${row.id})">🗑️</button></td>`;
    }
    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
  document.getElementById("rowCount").textContent =
    `${filteredData.length} aliment${filteredData.length > 1 ? "s" : ""} affiché${filteredData.length > 1 ? "s" : ""} sur ${nutritionData.length}`;
  updateGridColumns();
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

function updateGridColumns() {
  const visibleCols = document.querySelectorAll("thead th:not(.hidden)").length;
  document.querySelector("table").style.setProperty("--cols", visibleCols);
}

/* ============================
   ÉDITION (ajout / modif / suppression)
   ============================ */

function escapeAttr(val) {
  return String(val).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function toggleEditMode() {
  editMode = !editMode;
  document.body.classList.toggle("edit-mode", editMode);
  document.getElementById("editModeBtn").classList.toggle("btn-primary", editMode);
  renderTable();
}

function openEditModal(id) {
  editingId = id;
  const row =
    id == null ? {} : nutritionData.find((r) => r.id === id) || {};

  document.getElementById("modalTitle").textContent =
    id == null ? "Ajouter un aliment" : "Modifier l'aliment";

  let formHTML = "";
  allColumns.forEach((col) => {
    const val = row[col.key] ?? "";
    const isText = col.type === "text";
    const fullWidth =
      isText && (col.key === "Notes spécifiques" || col.key === "Aliments");
    const inputType = isText ? "text" : "number";
    const step = col.type === "score" ? "1" : "any";
    formHTML += `
      <div class="form-group${fullWidth ? " full-width" : ""}">
        <label>${col.label}</label>
        <input type="${inputType}" data-key="${escapeAttr(col.key)}"
               ${isText ? "" : `step="${step}"`} value="${escapeAttr(val)}">
      </div>`;
  });
  document.getElementById("editForm").innerHTML = formHTML;
  document.getElementById("editModal").classList.add("open");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("open");
  editingId = null;
}

function saveFood() {
  const inputs = document.querySelectorAll("#editForm input[data-key]");
  const data = {};
  inputs.forEach((input) => {
    const key = input.dataset.key;
    const col = allColumns.find((c) => c.key === key);
    let value = input.value.trim();
    if (value === "") {
      data[key] = null;
    } else if (col.type === "text") {
      data[key] = value;
    } else {
      const num = Number(value);
      data[key] = isNaN(num) ? value : num;
    }
  });

  if (!data["Aliments"]) {
    alert("Le nom de l'aliment est obligatoire.");
    return;
  }

  const keys = Object.keys(data);
  if (editingId == null) {
    const cols = keys.map((k) => `"${k.replace(/"/g, '""')}"`).join(", ");
    const ph = keys.map(() => "?").join(", ");
    db.run(`INSERT INTO foods (${cols}) VALUES (${ph})`, keys.map((k) => data[k]));
  } else {
    const setClause = keys
      .map((k) => `"${k.replace(/"/g, '""')}" = ?`)
      .join(", ");
    db.run(`UPDATE foods SET ${setClause} WHERE id = ?`, [
      ...keys.map((k) => data[k]),
      editingId,
    ]);
  }

  reloadFromDb();
  renderTable();
  closeEditModal();
}

function deleteFood(id) {
  const row = nutritionData.find((r) => r.id === id);
  const name = row ? row.Aliments : "cet aliment";
  if (!confirm(`Supprimer « ${name} » ?`)) return;
  db.run("DELETE FROM foods WHERE id = ?", [id]);
  reloadFromDb();
  renderTable();
}

// Exporte la base modifiée : à recommiter sur GitHub pour publier les changements.
function exportDb() {
  const data = db.export();
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nutrition.db";
  a.click();
  URL.revokeObjectURL(url);
}
