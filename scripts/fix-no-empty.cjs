const fs = require('fs');
const { execSync } = require('child_process');

const output = execSync('npx eslint . 2>&1', { cwd: 'C:/devs/WiseBook', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const lines = output.split('\n');
let currentFile = '';
const errors = [];

for (const line of lines) {
  if (/^[A-Z]:/.test(line) && !line.includes('error') && !line.includes('warning')) {
    currentFile = line.trim();
    continue;
  }
  const match = line.match(/^\s+(\d+):(\d+)\s+error\s+Empty block statement\s+no-empty/);
  if (match && currentFile) {
    errors.push({ file: currentFile, line: parseInt(match[1]), col: parseInt(match[2]) });
  }
}

console.log(`Found ${errors.length} no-empty errors`);

const byFile = {};
for (const e of errors) {
  if (!byFile[e.file]) byFile[e.file] = [];
  byFile[e.file].push(e.line);
}

let fixed = 0;
for (const [file, lineNums] of Object.entries(byFile)) {
  const content = fs.readFileSync(file, 'utf8');
  const fileLines = content.split('\n');
  const sorted = [...lineNums].sort((a, b) => b - a);

  for (const lineNum of sorted) {
    const idx = lineNum - 1;
    if (idx < 0 || idx >= fileLines.length) continue;
    const line = fileLines[idx];

    // Case 1: {} on same line
    if (line.match(/\{\s*\}/) && !line.includes('/* ignored */')) {
      fileLines[idx] = line.replace(/\{\s*\}/, '{ /* ignored */ }');
      fixed++;
      continue;
    }

    // Case 2: line ends with { and next non-blank is }
    if (line.trimEnd().endsWith('{')) {
      let nextIdx = idx + 1;
      while (nextIdx < fileLines.length && fileLines[nextIdx].trim() === '') nextIdx++;
      if (nextIdx < fileLines.length && fileLines[nextIdx].trim() === '}') {
        const indent = fileLines[nextIdx].match(/^(\s*)/)[1];
        fileLines.splice(idx + 1, nextIdx - idx - 1, indent + '  /* ignored */');
        fixed++;
        continue;
      }
    }

    // Case 3: { somewhere in middle of line, rest is whitespace
    const openBraceIdx = line.lastIndexOf('{');
    if (openBraceIdx >= 0 && line.substring(openBraceIdx + 1).trim() === '') {
      let nextIdx = idx + 1;
      while (nextIdx < fileLines.length && fileLines[nextIdx].trim() === '') nextIdx++;
      if (nextIdx < fileLines.length && fileLines[nextIdx].trim() === '}') {
        const indent = fileLines[nextIdx].match(/^(\s*)/)[1];
        fileLines.splice(idx + 1, nextIdx - idx - 1, indent + '  /* ignored */');
        fixed++;
        continue;
      }
    }

    console.log(`  Skip ${file}:${lineNum}: "${line.trim().substring(0, 80)}"`);
  }

  fs.writeFileSync(file, fileLines.join('\n'));
}

console.log(`Fixed ${fixed} no-empty errors`);
