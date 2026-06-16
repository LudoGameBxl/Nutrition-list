# Nutrition — Table des Aliments

Site **statique** (HTML/CSS/JS vanilla) déployable tel quel sur **GitHub Pages**,
qui affiche une table nutritionnelle d'aliments avec recherche, tri, sélection de
colonnes et impression.

Les données sont stockées dans une **base SQLite** (`nutrition.db`) chargée
directement dans le navigateur via **[sql.js](https://sql.js.org/)** (WebAssembly).
Aucun serveur, aucune dépendance réseau externe : `sql.js` est vendorisé dans
`vendor/`.

## Structure

| Fichier / dossier        | Rôle                                                            |
| ------------------------ | --------------------------------------------------------------- |
| `index.html`             | Page principale                                                 |
| `script.js`              | Chargement de la base, rendu, recherche/tri, édition            |
| `styles.css`             | Styles                                                          |
| `nutrition.db`           | **Source de vérité** : base SQLite (table `foods`)              |
| `vendor/sql-wasm.*`      | sql.js (moteur SQLite WASM) vendorisé                           |
| `data*.json`             | Données JSON d'origine (graine lisible / sauvegarde)            |
| `data_all.json`          | Export JSON consolidé regénéré par le build (diffs lisibles)    |
| `utils/build_db.js`      | Script Node qui regénère `nutrition.db` depuis les JSON         |

## Modifier les données

L'édition se fait **dans le navigateur** (les visiteurs, eux, restent en lecture
seule) :

1. Ouvrir le site et cliquer sur **✏️ Éditer** pour activer le mode édition.
2. **➕ Ajouter** un aliment, ou ✏️ / 🗑️ sur une ligne pour modifier / supprimer.
3. Cliquer sur **💾 Exporter la base** : un nouveau `nutrition.db` est téléchargé.
4. Remplacer `nutrition.db` à la racine du dépôt par le fichier téléchargé, puis
   **commiter et pousser** pour publier les changements.

## Regénérer la base depuis les JSON

Si vous préférez éditer les fichiers JSON à la main :

```bash
npm install        # installe sql.js (dépendance de dev uniquement)
npm run build:db   # regénère nutrition.db + data_all.json depuis les data*.json
```

Le script consolide `data.json` (sur-ensemble enrichi) et les fichiers par
catégorie (`data_drink.json`, `data_fruits.json`, …) en une seule table `foods`,
ajoute une colonne `Catégorie` et évite les doublons.
