const fs = require('fs');
const lines = fs.readFileSync('scripts/useless_escape.txt','utf8').trim().split('\n');
let file = '';
const errors = [];
for (const l of lines) {
  if (/^[A-Z]:/.test(l) && /\.(tsx?|jsx?|js)$/.test(l)) { file = l.trim(); continue; }
  const m = l.match(/(\d+):(\d+)\s+error/);
  if (m && file) errors.push({file, line: parseInt(m[1]), col: parseInt(m[2])});
}
console.log('Found', errors.length, 'useless escape errors');

const byFile = {};
for (const e of errors) {
  if (!byFile[e.file]) byFile[e.file] = [];
  byFile[e.file].push(e);
}

let fixed = 0;
for (const [filePath, errs] of Object.entries(byFile)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fl = content.split('\n');
  // Process reverse order to maintain positions
  const sorted = [...errs].sort((a, b) => b.line - a.line || b.col - a.col);
  for (const e of sorted) {
    const idx = e.line - 1;
    const line = fl[idx];
    const col = e.col - 1;
    if (line[col] === '\\') {
      fl[idx] = line.substring(0, col) + line.substring(col + 1);
      fixed++;
    } else {
      console.log('  No backslash at', filePath + ':' + e.line + ':' + e.col, 'found:', JSON.stringify(line[col]));
    }
  }
  fs.writeFileSync(filePath, fl.join('\n'));
}
console.log('Fixed', fixed);
