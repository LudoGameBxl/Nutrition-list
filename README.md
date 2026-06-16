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

Le site est en **lecture seule**. Les données se gèrent en éditant les fichiers
**JSON** (`data.json` et les fichiers par catégorie), puis en regénérant la base :

```bash
npm install        # installe sql.js (dépendance de dev uniquement)
npm run build:db   # regénère nutrition.db + data_all.json depuis les data*.json
```

Ensuite, **commiter et pousser** `nutrition.db` (et les JSON modifiés) pour
publier les changements.

Le script consolide `data.json` (sur-ensemble enrichi) et les fichiers par
catégorie (`data_drink.json`, `data_fruits.json`, …) en une seule table `foods`,
ajoute une colonne `Catégorie` et évite les doublons.
