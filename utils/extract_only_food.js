const fs = require('fs');

const dataFile = JSON.parse(fs.readFileSync('data.json', 'utf8'));


const KEY = 'Aliments';

console.log(Object.keys(dataFile[0]));

const foods = dataFile.map(item => item[KEY]);
// console.log(foods)


// const ids2 = new Set(aliments2.map(item => itdem[KEY]));

// const onlyInFile1 = aliments1.filter(item => !ids2.has(item[KEY]));
// const onlyInFile2 = aliments2.filter(item => !ids1.has(item[KEY]));

// const difference = [...onlyInFile1, ...onlyInFile2];

// console.log(`Différence (${difference.length} objets):`, difference);

fs.writeFileSync('foods.json', JSON.stringify(foods, null,0));