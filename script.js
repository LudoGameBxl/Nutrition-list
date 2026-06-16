let nutritionData = [];
let filteredData = [];
let visibleColumns = [];
let sortColumn = null;
let sortDirection = "asc";
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
