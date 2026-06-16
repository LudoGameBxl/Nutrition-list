// build_db.js
// Génère la base SQLite `nutrition.db` à partir des fichiers JSON.
//
// La base est la source de vérité du site : le navigateur la charge en
// lecture seule via sql.js. Ce script consolide data.json (le sur-ensemble
// enrichi) et les fichiers par catégorie en une seule table `foods`, en
// ajoutant une colonne "Catégorie" et sans créer de doublon.
//
// Usage : node utils/build_db.js

const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

const ROOT = path.join(__dirname, "..");

// Fichier source -> libellé de catégorie
const CATEGORY_FILES = {
  "data_drink.json": "Boissons",
  "data_fruits.json": "Fruits",
  "data_fruits_sec_graines.json": "Fruits secs & graines",
  "data_légume.json": "Légumes",
  "data_feculent.json": "Féculents",
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function buildRecords() {
  const main = readJson("data.json");

  // Map nom d'aliment -> catégorie (déduite des fichiers par catégorie)
  const categoryByName = new Map();
  const extras = []; // aliments présents seulement dans les fichiers catégorie
  const mainNames = new Set(main.map((r) => r.Aliments));

  for (const [file, label] of Object.entries(CATEGORY_FILES)) {
    for (const rec of readJson(file)) {
      if (!categoryByName.has(rec.Aliments)) {
        categoryByName.set(rec.Aliments, label);
      }
      if (!mainNames.has(rec.Aliments)) {
        extras.push({ ...rec, Catégorie: label });
        mainNames.add(rec.Aliments); // évite les doublons entre fichiers catégorie
      }
    }
  }

  // data.json garde ses données enrichies ; on lui ajoute la catégorie
  const merged = main.map((r) => ({
    ...r,
    Catégorie: categoryByName.get(r.Aliments) || "Général",
  }));

  return merged.concat(extras);
}

// Union ordonnée de toutes les clés rencontrées (préserve toutes les données)
function collectColumns(records) {
  const cols = [];
  const seen = new Set();
  const push = (k) => {
    if (!seen.has(k)) {
      seen.add(k);
      cols.push(k);
    }
  };
  push("Aliments");
  push("Catégorie");
  push("IG"); // garantit la présence de la colonne IG même si aucun record ne la renseigne
  for (const rec of records) Object.keys(rec).forEach(push);
  return cols;
}

// Affinité SQLite : REAL si toutes les valeurs non vides sont numériques, sinon TEXT
function inferType(records, key) {
  let hasValue = false;
  for (const rec of records) {
    const v = rec[key];
    if (v === undefined || v === null || v === "") continue;
    hasValue = true;
    if (typeof v !== "number" && isNaN(Number(v))) return "TEXT";
  }
  return hasValue ? "REAL" : "TEXT";
}

async function main() {
  const records = buildRecords();
  const columns = collectColumns(records);

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  const colDefs = columns
    .map((c) => `"${c.replace(/"/g, '""')}" ${inferType(records, c)}`)
    .join(",\n  ");
  db.run(
    `CREATE TABLE foods (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  ${colDefs}\n);`,
  );

  const placeholders = columns.map(() => "?").join(", ");
  const quotedCols = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(", ");
  const stmt = db.prepare(
    `INSERT INTO foods (${quotedCols}) VALUES (${placeholders})`,
  );
  for (const rec of records) {
    const values = columns.map((c) => {
      const v = rec[c];
      return v === undefined ? null : v;
    });
    stmt.run(values);
  }
  stmt.free();

  // Écriture de la base
  const data = db.export();
  fs.writeFileSync(path.join(ROOT, "nutrition.db"), Buffer.from(data));

  // Export JSON consolidé lisible (utile pour les diffs Git / sauvegarde)
  fs.writeFileSync(
    path.join(ROOT, "data_all.json"),
    JSON.stringify(records, null, 2),
  );

  db.close();
  console.log(
    `nutrition.db généré : ${records.length} aliments, ${columns.length + 1} colonnes.`,
  );
}

main().catch((e) => {
  console.error("Erreur build_db:", e);
  process.exit(1);
});
