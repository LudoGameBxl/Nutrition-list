# Nutrition — Table des Aliments

Site **statique** (HTML/CSS/JS vanilla) déployable tel quel sur **GitHub Pages**,
qui affiche une table nutritionnelle d'aliments avec recherche, tri, sélection de
colonnes, impression et un **calculateur de charge glycémique de repas**.

Les données sont stockées dans une **base SQLite** (`nutrition.db`) chargée
directement dans le navigateur via **[sql.js](https://sql.js.org/)** (WebAssembly).
Aucun serveur, aucune dépendance réseau externe : `sql.js` est vendorisé dans
`vendor/`.

## Structure

| Fichier / dossier        | Rôle                                                            |
| ------------------------ | --------------------------------------------------------------- |
| `index.html`             | Page principale                                                 |
| `script.js`              | Chargement base, rendu, recherche/tri, calculateur repas        |
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

## Calculateur de repas (charge glycémique)

Dans le tableau, cochez la case à côté d'un aliment et ajustez la **portion**
(100 g par défaut, **mémorisée** par aliment via le navigateur). Une **card récap**
en haut de page calcule en direct la **charge glycémique (CG)** du repas :

- **CG par aliment** = `IG × glucides(portion) / 100` (glucides exprimés pour 100 g,
  mis à l'échelle de la portion).
- **CG ajustée** : la CG brute du repas est réduite par les accompagnements présents,
  détectés automatiquement d'après les totaux du repas :
  - Fibres ≥ 3 g → ×0,75 · Protéines ≥ 10 g → ×0,78 · Lipides ≥ 10 g → ×0,80.
- Code couleur : CG < 10 faible 🟢 · 10–19 modérée 🟠 · ≥ 20 élevée 🔴.

Les seuils et facteurs sont regroupés en tête de `script.js` (`CG_SEUILS`,
`CG_FACTEURS`, `CG_COULEURS`) et faciles à ajuster.

### Colonne `IG` (index glycémique)

La CG dépend de l'**index glycémique** de chaque aliment, stocké dans la colonne
**`IG`** des JSON. Des valeurs de référence ont été amorcées pour les aliments
glucidiques (féculents, fruits, sucres…) ; les aliments sans IG comptent pour une
CG de 0. Pour affiner ou compléter, éditez le champ `IG` dans les `data*.json`
puis relancez `npm run build:db`. Un aliment glucidique sans IG affiche un rappel
« ⚠️ IG manquant » dans la card.
