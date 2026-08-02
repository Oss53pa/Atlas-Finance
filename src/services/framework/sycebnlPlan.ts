/**
 * Plan de comptes SYCEBNL — référentiel complet (8 classes).
 *
 * ⚠️ RÉFÉRENCE INDICATIVE : plan comptable des entités à but non lucratif
 * (SYCEBNL, 2023). La structure et les comptes principaux sont documentés, mais
 * les codes doivent être VALIDÉS contre le plan officiel de l'entité avant toute
 * production réglementaire. Les classes 2-5 reprennent l'ossature SYSCOHADA ;
 * les classes 1, 6 et 7 portent les spécificités non lucratives (fonds propres
 * sans/avec droit de reprise, fonds dédiés, cotisations/dons/legs, mécanique de
 * report des ressources affectées 689/789).
 *
 * `specifique = true` signale un compte PROPRE au SYCEBNL (absent ou de sens
 * différent en SYSCOHADA commercial).
 */

export interface SycebnlPlanAccount {
  code: string;
  libelle: string;
  classe: number;
  /** Compte principal (2 chiffres) vs compte de détail. */
  principal: boolean;
  /** Spécifique au secteur non lucratif. */
  specifique: boolean;
}

const P = (code: string, libelle: string, classe: number, specifique = false): SycebnlPlanAccount =>
  ({ code, libelle, classe, principal: code.length === 2, specifique });

export const SYCEBNL_PLAN: SycebnlPlanAccount[] = [
  // ═══ CLASSE 1 — Fonds propres, provisions et dettes financières ═══════════
  P('10', 'Fonds propres', 1, true),
  P('102', 'Fonds propres sans droit de reprise', 1, true),
  P('103', 'Fonds propres avec droit de reprise', 1, true),
  P('104', 'Fonds affectés et dotations consomptibles', 1, true),
  P('105', "Écarts de réévaluation", 1),
  P('106', 'Réserves', 1),
  P('109', 'Fonds propres — apporteurs, compte de retrait', 1, true),
  P('11', 'Report à nouveau', 1, true),
  P('110', 'Report à nouveau créditeur', 1),
  P('119', 'Report à nouveau débiteur', 1),
  P('12', "Résultat de l'exercice", 1, true),
  P('120', "Résultat — Excédent", 1, true),
  P('129', "Résultat — Déficit", 1, true),
  P('13', 'Fonds reportés et fonds dédiés', 1, true),
  P('131', 'Fonds dédiés sur subventions de fonctionnement', 1, true),
  P('132', 'Fonds dédiés sur dons manuels affectés', 1, true),
  P('133', 'Fonds dédiés sur legs et donations affectés', 1, true),
  P('14', "Subventions d'investissement", 1, true),
  P('15', 'Provisions réglementées et fonds assimilés', 1),
  P('16', 'Emprunts et dettes assimilées', 1),
  P('18', 'Comptes de liaison des établissements et sociétés en participation', 1),
  P('19', 'Provisions pour risques et charges', 1),

  // ═══ CLASSE 2 — Actif immobilisé (ossature SYSCOHADA) ═════════════════════
  P('20', 'Charges immobilisées', 2),
  P('21', 'Immobilisations incorporelles', 2),
  P('22', 'Terrains', 2),
  P('23', 'Bâtiments, installations techniques et agencements', 2),
  P('24', 'Matériel, mobilier et actifs biologiques', 2),
  P('25', 'Avances et acomptes versés sur immobilisations', 2),
  P('26', 'Titres de participation', 2),
  P('27', 'Autres immobilisations financières', 2),
  P('28', 'Amortissements', 2),
  P('29', 'Dépréciations des immobilisations', 2),

  // ═══ CLASSE 3 — Stocks ════════════════════════════════════════════════════
  P('31', 'Marchandises', 3),
  P('32', 'Matières premières et fournitures liées', 3),
  P('33', 'Autres approvisionnements', 3),
  P('34', 'Produits en cours', 3),
  P('35', 'Services en cours', 3),
  P('36', 'Produits finis', 3),
  P('38', 'Stocks en cours de route, en consignation ou en dépôt', 3),
  P('39', 'Dépréciations des stocks', 3),

  // ═══ CLASSE 4 — Tiers ═════════════════════════════════════════════════════
  P('40', 'Fournisseurs et comptes rattachés', 4),
  P('41', 'Membres, usagers et comptes rattachés', 4, true),
  P('42', 'Personnel', 4),
  P('43', 'Organismes sociaux', 4),
  P('44', 'État et collectivités publiques', 4),
  P('45', 'Organismes internationaux et bailleurs de fonds', 4, true),
  P('46', 'Débiteurs et créditeurs divers', 4),
  P('47', 'Comptes transitoires ou d\'attente', 4),
  P('48', 'Créances et dettes hors activités ordinaires', 4),
  P('49', 'Dépréciations et provisions des comptes de tiers', 4),

  // ═══ CLASSE 5 — Trésorerie ════════════════════════════════════════════════
  P('50', 'Titres de placement', 5),
  P('51', 'Valeurs à encaisser', 5),
  P('52', 'Banques', 5),
  P('53', 'Établissements financiers et assimilés', 5),
  P('54', 'Instruments de trésorerie', 5),
  P('56', 'Banques, crédits de trésorerie et d\'escompte', 5),
  P('57', 'Caisse', 5),
  P('58', 'Régies d\'avances, accréditifs et virements internes', 5),
  P('59', 'Dépréciations et provisions pour risques à court terme', 5),

  // ═══ CLASSE 6 — Charges (emplois) ═════════════════════════════════════════
  P('60', 'Achats et variations de stocks', 6),
  P('61', 'Transports', 6),
  P('62', 'Services extérieurs A', 6),
  P('63', 'Services extérieurs B', 6),
  P('64', 'Impôts et taxes', 6),
  P('65', 'Autres charges', 6),
  P('657', 'Aides, secours et subventions accordées', 6, true),
  P('66', 'Charges de personnel', 6),
  P('67', 'Frais financiers et charges assimilées', 6),
  P('68', 'Dotations aux amortissements et aux provisions', 6),
  P('689', 'Engagements à réaliser sur ressources affectées', 6, true),
  P('69', 'Dotations aux provisions et dépréciations (HAO)', 6),

  // ═══ CLASSE 7 — Produits (ressources) ═════════════════════════════════════
  P('70', 'Ventes et prestations de services', 7),
  P('71', 'Production stockée et immobilisée', 7),
  P('72', 'Production immobilisée', 7),
  P('73', 'Variations des stocks de biens et services produits', 7),
  P('74', "Subventions d'exploitation", 7, true),
  P('740', "Subventions d'exploitation reçues", 7, true),
  P('75', 'Autres produits — ressources propres', 7, true),
  P('754', 'Cotisations', 7, true),
  P('755', 'Dons et libéralités', 7, true),
  P('7551', 'Dons manuels', 7, true),
  P('756', 'Legs et donations', 7, true),
  P('77', 'Revenus financiers et produits assimilés', 7),
  P('78', 'Transferts de charges et reprises de provisions', 7),
  P('789', 'Report des ressources non utilisées des exercices antérieurs', 7, true),
  P('79', 'Reprises de provisions et dépréciations', 7),

  // ═══ CLASSE 8 — Comptes des autres charges et produits (HAO) ══════════════
  P('81', 'Valeurs comptables des cessions d\'immobilisations', 8),
  P('82', 'Produits des cessions d\'immobilisations', 8),
  P('84', 'Charges HAO', 8),
  P('86', 'Produits HAO', 8),
  P('88', 'Subventions d\'équilibre', 8, true),
];

const BY_CODE_PLAN = new Map(SYCEBNL_PLAN.map(a => [a.code, a]));

/** Résout un compte du plan SYCEBNL par préfixe le plus long. */
export function resolveSycebnlPlanAccount(code: string): SycebnlPlanAccount | undefined {
  const c = String(code || '');
  for (let len = c.length; len >= 2; len--) {
    const hit = BY_CODE_PLAN.get(c.slice(0, len));
    if (hit) return hit;
  }
  return undefined;
}

/** Regroupe le plan par classe (comptes principaux + détail spécifiques). */
export function sycebnlPlanByClasse(): Array<{ classe: number; comptes: SycebnlPlanAccount[] }> {
  const m = new Map<number, SycebnlPlanAccount[]>();
  for (const a of SYCEBNL_PLAN) {
    if (!m.has(a.classe)) m.set(a.classe, []);
    m.get(a.classe)!.push(a);
  }
  return [...m.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([classe, comptes]) => ({
      classe,
      comptes: comptes.sort((x, y) => x.code.localeCompare(y.code)),
    }));
}

export const CLASSE_LABELS: Record<number, string> = {
  1: 'Fonds propres, provisions et dettes financières',
  2: 'Actif immobilisé',
  3: 'Stocks',
  4: 'Tiers',
  5: 'Trésorerie',
  6: 'Charges (emplois)',
  7: 'Produits (ressources)',
  8: 'Autres charges et produits (HAO)',
};
