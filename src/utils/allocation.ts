/**
 * allocation — répartition déterministe par la méthode du PLUS FORT RESTE
 * (largest remainder). Garantit Σ parts == total EXACTEMENT (zéro fuite de
 * centime), en entiers. Cœur de l'invariant de réconciliation analytique.
 */

/**
 * Répartit `totalCents` (entier signé) sur N destinations selon des `weights`
 * (poids ≥ 0). Renvoie un tableau d'entiers de même longueur dont la somme vaut
 * exactement `totalCents`.
 *
 * - Si Σ weights == 0 : tout va à la première destination (résidu non perdu).
 * - Le signe de `totalCents` est respecté (charges +, produits −).
 * - Allocation proportionnelle par troncature, puis les centimes restants sont
 *   attribués aux plus forts restes (ordre stable par indice en cas d'égalité).
 */
export function largestRemainderAllocate(totalCents: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const total = Math.trunc(totalCents);
  const sign = total < 0 ? -1 : 1;
  const absTotal = Math.abs(total);

  const cleanWeights = weights.map(w => (Number.isFinite(w) && w > 0 ? w : 0));
  const sumW = cleanWeights.reduce((s, w) => s + w, 0);

  if (sumW <= 0) {
    const out = new Array(n).fill(0);
    out[0] = total;
    return out;
  }

  // Part exacte (flottant) → base entière par troncature + reste fractionnaire.
  const exact = cleanWeights.map(w => (absTotal * w) / sumW);
  const base = exact.map(Math.floor);
  let allocated = base.reduce((s, v) => s + v, 0);
  let remaining = absTotal - allocated; // centimes à distribuer (≥ 0, < n)

  // Trier les indices par reste fractionnaire décroissant (stable par indice).
  const order = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => (b.frac - a.frac) || (a.i - b.i));

  const out = base.slice();
  for (let k = 0; k < order.length && remaining > 0; k++) {
    out[order[k].i] += 1;
    remaining -= 1;
  }
  return out.map(v => v * sign);
}
