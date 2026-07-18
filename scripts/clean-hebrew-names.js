// Script to clean Hebrew names and translate meanings
// This script removes displayName fields and translates English meanings to Hebrew

const fs = require('fs');
const path = require('path');

// Hebrew translations for common meanings
const translations = {
  "beloved": "אהוב",
  "God is my judge": "אלוהים הוא השופט שלי", 
  "who is like God": "מי כמוני אלוהים",
  "God has given": "אלוהים נתן",
  "God is salvation": "אלוהים הוא ישועה",
  "high mountain": "הר גבוה",
  "son of the right hand": "בן יד ימין",
  "heard by God": "נשמע על ידי אלוהים",
  "laughter": "צחוק",
  "rest, comfort": "מנוחה, נחמה",
  "dew": "טל",
  "purity": "טוהר",
  "good": "טוב",
  "God is good": "אלוהים טוב",
  "innocent": "תמים",
  "perfection": "שלמות",
  "tall": "גבוה",
  "dew of light": "טל אור",
  "hidden": "נסתר",
  "he will enlighten": "הוא יאיר",
  "gift of God": "מתנת אלוהים",
  "forest": "יער",
  "he will redeem": "הוא יגאל",
  "he will rejoice": "הוא ישמח",
  "beloved friend": "ידיד אהוב",
  "beloved of God": "ידידיה",
  "he will give": "הוא יתן",
  "praised": "מהולל",
  "light": "אור",
  "my light": "האור שלי",
  "enlightener": "מאיר",
  "water": "מים",
  "shield": "מגן",
  "gift": "מתנה",
  "myrrh": "מור",
  "rain": "גשם",
  "sea": "ים",
  "spring": "אביב",
  "mighty": "אדיר",
  "man, earth": "אדם, אדמה",
  "noble": "אציל",
  "unity": "אחדות",
  "encourager": "מעודד",
  "sympathy": "הזדהות",
  "gold": "זהב",
  "horizon": "אופק",
  "pine tree": "עץ אורן",
  "happiness": "אושר",
  "deer": "צבי",
  "oak tree": "עץ אלון",
  "tree": "עץ",
  "with me": "איתי",
  "island of palms": "אי התמרים",
  "strong": "חזק",
  "oak": "אלון"
};

function cleanHebrewNames() {
  const filePath = path.join(__dirname, '../src/data/babyNames.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove displayName fields and translate meanings for Hebrew names
  content = content.replace(
    /{ name: "([^"]+)", displayName: "[^"]+", origin: "Hebrew", meaning: "([^"]+)", gender: "([^"]+)", language: "he", countries: \["IL"\] }/g,
    (match, name, meaning, gender) => {
      const hebrewMeaning = translations[meaning] || meaning;
      return `{ name: "${name}", origin: "Hebrew", meaning: "${hebrewMeaning}", gender: "${gender}", language: "he", countries: ["IL"] }`;
    }
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Hebrew names cleaned successfully!');
  console.log('Removed displayName fields and translated meanings to Hebrew.');
}

// Run the cleanup
cleanHebrewNames();