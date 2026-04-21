// Fixes UTF-8-interpreted-as-Latin1 mojibake in source files (recursive).
const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\devs\\WiseBook\\src';
const EXTS = new Set(['.tsx', '.ts', '.css']);

// Double-encoded first (unwrap one layer), then single-encoded.
const REPLACEMENTS = [
  // Double-encoded
  ['Ãƒâ€°', 'É'],
  ['ÃƒÂ©', 'é'],
  ['ÃƒÂ¨', 'è'],
  ['ÃƒÂ§', 'ç'],
  ['ÃƒÂ´', 'ô'],
  ['ÃƒÂ®', 'î'],
  ['ÃƒÂ¢', 'â'],
  ['ÃƒÂ»', 'û'],
  ['ÃƒÂª', 'ê'],
  ['ÃƒÂ¹', 'ù'],
  ['ÃƒÂ ', 'à'],
  ['ÃƒÂ€', 'À'],
  ['ÃƒÂ‰', 'É'],
  // Single-encoded latin caps (non-standard start codepoints)
  ['Ã©', 'é'],
  ['Ã¨', 'è'],
  ['Ã§', 'ç'],
  ['Ã´', 'ô'],
  ['Ã®', 'î'],
  ['Ã¢', 'â'],
  ['Ã»', 'û'],
  ['Ãª', 'ê'],
  ['Ã¹', 'ù'],
  ['Ã€', 'À'],
  ['Ã‰', 'É'],
  ['Ãˆ', 'È'],
  ['Ã‡', 'Ç'],
  ['Ã”', 'Ô'],
  ['ÃŽ', 'Î'],
  ['Ã‚', 'Â'],
  ['Ã›', 'Û'],
  ['ÃŠ', 'Ê'],
  ['Ã™', 'Ù'],
  ['Ã ', 'à'],
  // Curly quotes, dashes, ellipsis, etc.
  ['â€™', '\u2019'],
  ['â€˜', '\u2018'],
  ['â€œ', '\u201C'],
  ['â€\u009D', '\u201D'],
  ['â€”', '—'],
  ['â€“', '–'],
  ['â€¦', '…'],
  ['â€¢', '•'],
  ['Â«', '«'],
  ['Â»', '»'],
  ['Â°', '°'],
  ['Â ', ' '],
];

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (EXTS.has(path.extname(entry.name))) out.push(p);
  }
}

const files = [];
walk(ROOT, files);

let totalChanges = 0;
const modifiedFiles = [];

for (const full of files) {
  let text = fs.readFileSync(full, 'utf8');
  const before = text;
  let fileChanges = 0;
  for (const [bad, good] of REPLACEMENTS) {
    if (text.includes(bad)) {
      const parts = text.split(bad);
      fileChanges += parts.length - 1;
      text = parts.join(good);
    }
  }
  if (text !== before) {
    fs.writeFileSync(full, text, 'utf8');
    modifiedFiles.push(path.relative('C:\\devs\\WiseBook', full) + ' (' + fileChanges + ')');
    totalChanges += fileChanges;
  }
}

console.log('Scanned:', files.length, 'files');
console.log('Total replacements:', totalChanges);
console.log('Modified files:');
for (const m of modifiedFiles) console.log('  ' + m);
