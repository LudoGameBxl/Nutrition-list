let nutritionData = [];
let filteredData = [];
let visibleColumns = [];
let sortColumn = null;
let sortDirection = "asc";
let db = null; // base SQLite chargée en mémoire (sql.js)

/* ============================
   CALCULATEUR CHARGE GLYCÉMIQUE (CG) DU REPAS
   Réglages : seuils de détection (g, totaux repas) + facteurs de modulation
   ============================ */
const CG_SEUILS = { FIBRES: 3, PROTEINES: 10, LIPIDES: 10 };
const CG_FACTEURS = { FIBRES: 0.75, PROTEINES: 0.78, LIPIDES: 0.8 };
const CG_COULEURS = { FAIBLE: 10, MODEREE: 20 }; // CG < 10 = 🟢 · < 20 = 🟠 · ≥ 20 = 🔴

let mealPortions = {}; // { nom: grammes } — portion mémorisée par aliment
let mealSelection = new Set(); // noms d'aliments cochés pour le repas

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
  { key: "IG", label: "IG", type: "number" },
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
  loadMealState();
  await loadData();
  renderTable();
  setupEventListeners();
  renderMealCard();
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
  // Sélection repas + portions (délégation : les noms peuvent contenir des apostrophes)
  document.getElementById("tableContainer").addEventListener("change", (e) => {
    const t = e.target;
    if (t.classList.contains("meal-check")) toggleMeal(t.dataset.nom, t.checked);
    else if (t.classList.contains("portion-input"))
      setPortion(t.dataset.nom, t.value);
  });
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
        const nom = String(val);
        const checked = mealSelection.has(nom) ? "checked" : "";
        html += `<td class="aliment-name"><span class="meal-ctl no-print"><input type="checkbox" class="meal-check" data-nom="${escAttr(nom)}" ${checked} title="Ajouter au repas"><input type="number" class="portion-input" data-nom="${escAttr(nom)}" min="0" step="10" value="${getPortion(nom)}" title="Portion (g)"></span>${val}</td>`;
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
  const table = document.querySelector("#tableContainer table");
  if (!table) return;
  const visibleCols = table.querySelectorAll("thead th:not(.hidden)").length;
  table.style.setProperty("--cols", visibleCols);
}

/* ============================
   REPAS : état persistant (localStorage), calcul et rendu de la card
   ============================ */

function escAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function loadMealState() {
  try {
    mealPortions = JSON.parse(localStorage.getItem("mealPortions")) || {};
    mealSelection = new Set(
      JSON.parse(localStorage.getItem("mealSelection")) || [],
    );
  } catch (e) {
    mealPortions = {};
    mealSelection = new Set();
  }
}

function saveMealState() {
  localStorage.setItem("mealPortions", JSON.stringify(mealPortions));
  localStorage.setItem("mealSelection", JSON.stringify([...mealSelection]));
}

function getPortion(nom) {
  return mealPortions[nom] ?? 100;
}

function setPortion(nom, g) {
  mealPortions[nom] = Math.max(0, Number(g) || 0);
  saveMealState();
  renderMealCard();
}

function toggleMeal(nom, checked) {
  if (checked) mealSelection.add(nom);
  else mealSelection.delete(nom);
  saveMealState();
  renderMealCard();
}

function clearMeal() {
  mealSelection.clear();
  saveMealState();
  renderTable(); // décoche les cases du tableau
  renderMealCard();
}

// Calcule la charge glycémique du repas et les facteurs de modulation.
function computeMeal() {
  const items = [];
  let cgRepas = 0,
    totFib = 0,
    totProt = 0,
    totLip = 0;
  mealSelection.forEach((nom) => {
    const row = nutritionData.find((r) => r.Aliments === nom);
    if (!row) return;
    const p = getPortion(nom);
    const f = (k) => ((Number(row[k]) || 0) * p) / 100;
    const glucides = f("Glucides (g)");
    const fib = f("Fibres (g)");
    totFib += fib;
    totProt += f("Protéines (g)");
    totLip += f("Lipides (g)");
    const ig = Number(row["IG"]) || 0;
    const cg = (ig * glucides) / 100;
    cgRepas += cg;
    items.push({
      nom,
      portion: p,
      glucides,
      ig,
      cg,
      igManquant: !ig && glucides - fib >= 10, // glucides nets significatifs sans IG
    });
  });

  const modulateurs = [];
  let facteur = 1;
  const addMod = (cond, label, fac) => {
    if (cond) {
      facteur *= fac;
      modulateurs.push({ label, facteur: fac });
    }
  };
  addMod(totFib >= CG_SEUILS.FIBRES, "Fibres", CG_FACTEURS.FIBRES);
  addMod(totProt >= CG_SEUILS.PROTEINES, "Protéines", CG_FACTEURS.PROTEINES);
  addMod(totLip >= CG_SEUILS.LIPIDES, "Lipides", CG_FACTEURS.LIPIDES);

  return {
    items,
    cgRepas,
    totaux: { fib: totFib, prot: totProt, lip: totLip },
    modulateurs,
    facteur,
    cgAjustee: cgRepas * facteur,
  };
}

function cgClass(cg) {
  if (cg < CG_COULEURS.FAIBLE) return "cg-low";
  if (cg < CG_COULEURS.MODEREE) return "cg-mid";
  return "cg-high";
}

function cgLabel(cg) {
  if (cg < CG_COULEURS.FAIBLE) return "faible";
  if (cg < CG_COULEURS.MODEREE) return "modérée";
  return "élevée";
}

const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString("fr-FR");

function renderMealCard() {
  const card = document.getElementById("mealCard");
  if (!card) return;
  const meal = computeMeal();

  if (meal.items.length === 0) {
    card.classList.remove("active");
    card.innerHTML = `<p class="meal-empty">🍽️ Cochez des aliments dans le tableau pour composer un repas et estimer sa charge glycémique.</p>`;
    return;
  }
  card.classList.add("active");

  const rows = meal.items
    .map(
      (it) =>
        `<tr><td class="m-name">${it.nom}${it.igManquant ? ' <span class="m-warn" title="IG manquant : la CG est sous-estimée">⚠️ IG manquant</span>' : ""}</td><td>${fmt1(it.portion)} g</td><td>${fmt1(it.glucides)} g</td><td>${it.ig || "—"}</td><td><span class="cg-badge ${cgClass(it.cg)}">${fmt1(it.cg)}</span></td></tr>`,
    )
    .join("");

  const mods = meal.modulateurs.length
    ? meal.modulateurs
        .map((m) => `<span class="m-mod">${m.label} ×${m.facteur}</span>`)
        .join(" ")
    : '<span class="m-mod m-none">aucun</span>';

  card.innerHTML = `
    <div class="meal-head">
      <h3>🍽️ Mon repas — Charge glycémique</h3>
      <button class="btn" onclick="clearMeal()">Vider</button>
    </div>
    <table class="meal-table">
      <thead><tr><th>Aliment</th><th>Portion</th><th>Glucides</th><th>IG</th><th>CG</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="meal-summary">
      <div class="meal-line"><span>CG repas (brute)</span><span class="cg-badge ${cgClass(meal.cgRepas)}">${fmt1(meal.cgRepas)}</span></div>
      <div class="meal-line"><span>Modulateurs détectés</span><span class="meal-mods">${mods}</span></div>
      <div class="meal-line meal-total"><span>CG ajustée</span><span><span class="cg-badge cg-big ${cgClass(meal.cgAjustee)}">${fmt1(meal.cgAjustee)}</span> <span class="cg-tag ${cgClass(meal.cgAjustee)}">${cgLabel(meal.cgAjustee)}</span></span></div>
    </div>`;
}
