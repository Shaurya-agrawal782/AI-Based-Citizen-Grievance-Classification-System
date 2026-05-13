const fs = require('fs');
const path = require('path');

function findUntranslatedStrings(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findUntranslatedStrings(fullPath, fileList);
    } else if (fullPath.endsWith('.jsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = findUntranslatedStrings('client/src');
let totalMissed = 0;

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Very basic regex to find text between > and <
  // Matches > Text < but ignores things that look like code or already use {t(
  const matches = [...code.matchAll(/>([^<{}]+)</g)];
  
  let missedInFile = [];
  for (const match of matches) {
    const text = match[1].trim();
    // Ignore short strings, pure punctuation, pure numbers, or things that are just whitespace
    if (text.length > 2 && /[A-Za-z]/.test(text) && !text.includes('=>') && !text.includes('=')) {
      // It's probably hardcoded text
      missedInFile.push(text);
    }
  }
  
  // Check placeholders
  const placeholders = [...code.matchAll(/placeholder="([^"]+)"/g)];
  for (const match of placeholders) {
    missedInFile.push(`[placeholder] ${match[1]}`);
  }

  // Check strings in static arrays often used in map (heuristic)
  // E.g., title: "Something"
  const titles = [...code.matchAll(/title:\s*['"]([^'"]+)['"]/g)];
  for (const match of titles) {
    const text = match[1];
    if (text.length > 2 && /[A-Za-z]/.test(text) && !text.includes('t(')) {
      missedInFile.push(`[title] ${text}`);
    }
  }
  
  if (missedInFile.length > 0) {
    console.log(`\n--- ${path.basename(file)} ---`);
    missedInFile.forEach(t => console.log(`  "${t}"`));
    totalMissed += missedInFile.length;
  }
}

console.log(`\nTotal potentially untranslated strings found: ${totalMissed}`);
