/**
 * accountLabels — Résolution SYNCHRONE « code de compte → libellé » à partir du
 * référentiel SYSCOHADA (source unique, aucune donnée à charger). Helper partagé
 * pour afficher partout le libellé à côté du numéro de compte.
 *
 * Correspondance par préfixe décroissant : compte exact → 3 chiffres → 2 chiffres
 * → classe. Renvoie '' si inconnu (l'appelant garde alors le code seul).
 *
 * NB : pour le libellé RÉEL (éventuellement personnalisé) d'un tenant, préférer le
 * nom porté par la donnée (accounts.name / line.accountName) quand il est présent ;
 * ce helper est le repli universel standard.
 */
import {
  SOUS_COMPTES_SYSCOHADA, CATEGORIES_SYSCOHADA, CLASSES_SYSCOHADA,
} from '../data/syscohada-referentiel';

const LABEL_BY_CODE = new Map<string, string>();
// Ordre d'insertion sans importance (clés distinctes par longueur).
CLASSES_SYSCOHADA.forEach(c => LABEL_BY_CODE.set(String(c.code), c.libelle));
CATEGORIES_SYSCOHADA.forEach(c => LABEL_BY_CODE.set(c.code, c.libelle));
SOUS_COMPTES_SYSCOHADA.forEach(sc => LABEL_BY_CODE.set(sc.code, sc.libelle));

/** Libellé standard SYSCOHADA d'un compte (ou '' si inconnu). */
export function getAccountLabel(code: string | number | null | undefined): string {
  const c = String(code ?? '').trim();
  if (!c) return '';
  const exact = LABEL_BY_CODE.get(c);
  if (exact) return exact;
  for (const len of [3, 2, 1]) {
    if (c.length >= len) {
      const hit = LABEL_BY_CODE.get(c.slice(0, len));
      if (hit) return hit;
    }
  }
  return '';
}

/**
 * « 235 — Aménagements de bureaux » (code + libellé). Si le libellé est inconnu,
 * renvoie le code seul. `sep` personnalisable (défaut « — »).
 */
export function formatAccountWithLabel(code: string | number | null | undefined, sep = ' — '): string {
  const c = String(code ?? '').trim();
  if (!c) return '';
  const label = getAccountLabel(c);
  return label ? `${c}${sep}${label}` : c;
}
