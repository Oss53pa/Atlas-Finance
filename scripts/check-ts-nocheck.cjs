#!/usr/bin/env node
/**
 * Garde-fou anti-régression : interdit l'ajout de NOUVEAUX `// @ts-nocheck`.
 *
 * La dette `@ts-nocheck` (fichiers qui désactivent le typage) est gelée à une
 * baseline. Ce script compte les fichiers `src/**.{ts,tsx}` contenant la
 * directive et échoue (exit 1) si le total DÉPASSE la baseline.
 *
 * - Ajouter un @ts-nocheck → le compte monte → CI rouge (corrigez les types).
 * - En retirer un (en corrigeant les types) → le compte descend → baissez la
 *   baseline ci-dessous d'autant (le script vous le rappelle).
 *
 * Objectif : la dette ne peut que diminuer, jamais croître.
 */
const fs = require('fs');
const path = require('path');

// Baseline = nombre de fichiers @ts-nocheck au moment du gel.
// NE PAS augmenter. À diminuer au fur et à mesure que les fichiers sont typés.
const BASELINE = 102;

const ROOT = path.join(__dirname, '..', 'src');
const DIRECTIVE = /(^|\n)\s*\/\/\s*@ts-nocheck\b/;

/** @type {string[]} */
const offenders = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walk(p);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      const content = fs.readFileSync(p, 'utf8');
      if (DIRECTIVE.test(content)) {
        offenders.push(path.relative(path.join(__dirname, '..'), p));
      }
    }
  }
}

walk(ROOT);
const count = offenders.length;

if (count > BASELINE) {
  console.error(
    `\n[check-ts-nocheck] ÉCHEC : ${count} fichiers @ts-nocheck > baseline ${BASELINE}.\n` +
    `Vous avez probablement ajouté un nouveau // @ts-nocheck. Corrigez les types\n` +
    `au lieu de désactiver le typage. La dette ne doit pas croître.\n`
  );
  process.exit(1);
}

if (count < BASELINE) {
  console.log(
    `[check-ts-nocheck] OK : ${count} fichiers @ts-nocheck (< baseline ${BASELINE}).\n` +
    `  → Merci ! Abaissez BASELINE à ${count} dans scripts/check-ts-nocheck.cjs pour verrouiller le gain.`
  );
} else {
  console.log(`[check-ts-nocheck] OK : ${count} fichiers @ts-nocheck (= baseline).`);
}
process.exit(0);
