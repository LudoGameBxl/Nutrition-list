const fs = require('fs');

// Lecture des fichiers
const dataFile = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const valuesFile = JSON.parse(fs.readFileSync('timing.json', 'utf8'));

// Aplatir le tableau de valeurs en un seul objet { "Fraises (jardin)": {...}, ... }
const valuesMap = Object.assign({}, ...valuesFile);

// Fusionner avec data.json
const updatedData = dataFile.map(item => {
  const aliment = item.Aliments;
  if (valuesMap[aliment]) {
    return { ...item, ...valuesMap[aliment] };
  }
  return item;
});

console.log(updatedData);

fs.writeFileSync('data2.json', JSON.stringify(updatedData, null, 0));
console.log('✅ data2.json mis à jour');