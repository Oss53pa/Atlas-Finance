/**
 * carCockpitService — Vue 360° d'un CAR (Capital Appropriation Request).
 *
 * PÉRIMÈTRE ASSUMÉ (cf. docs/integration-suite-atlas/DESIGN.md §L3.3) : le
 * processus achats (PR → PO → réception → facture) appartient à **Atlas Procure**.
 * F&A reçoit le RÉSULTAT, pas le processus. Ce service ne crée donc aucun document
 * d'achat : il LIT la comptabilité et les engagements pour reconstituer le cycle de
 * vie d'une appropriation.
 *
 * Clé de liaison : la section analytique du projet CAPEX (code CPX-XXXX) créée à
 * l'émission du CAR — les engagements (PO) la portent via capex_section_projet_id,
 * et le réalisé GL y est ventilé (v_actual_by_section).
 *
 * Chaîne restituée : approprié → engagé → facturé → payé.
 */
import type { DataAdapter } from '@atlas/data';
import { listEngagements, engagementRestant, type BudgetEngagement } from './engagementService';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode?.() === 'saas' && c ? c : null;
}

export interface CarFournisseurLigne {
  libelle: string;
  engage: number;
  facture: number;
  nbEngagements: number;
}

export interface CarFactureLigne {
  journalLineId: string;
  date: string | null;
  piece: string | null;
  libelle: string | null;
  accountCode: string | null;
  montant: number;
  fournisseur: string | null;
  engagementRef: string | null;
}

export interface CarCockpit {
  /** Montant approprié par le CAR lui-même. */
  approprie: number;
  /** Σ engagements (PO) rattachés au projet, net des dégagements. */
  engage: number;
  /** Σ montant_facture des engagements (avancement de facturation). */
  facture: number;
  /** Réalisé GL classe 2 ventilé sur la section projet (immobilisation constatée). */
  realiseGl: number;
  engagements: BudgetEngagement[];
  fournisseurs: CarFournisseurLigne[];
  factures: CarFactureLigne[];
  /** Renseigné quand le BC n'a pas encore de projet (CAR émis sans section). */
  sansProjet: boolean;
}

const EMPTY: CarCockpit = {
  approprie: 0, engage: 0, facture: 0, realiseGl: 0,
  engagements: [], fournisseurs: [], factures: [], sansProjet: true,
};

/**
 * Reconstitue la vue 360° pour un business case donné.
 * @param sectionProjetId section analytique du projet (capex_projets.section_analytique_projet_id)
 * @param sectionCode     code de la section (CPX-XXXX) — clé de v_actual_by_section
 */
export async function getCarCockpit(
  adapter: DataAdapter,
  opts: { approprie: number; sectionProjetId: string | null; sectionCode: string | null; annee: string },
): Promise<CarCockpit> {
  const client = getClient(adapter);
  if (!client) return { ...EMPTY, approprie: opts.approprie };
  if (!opts.sectionProjetId) return { ...EMPTY, approprie: opts.approprie };

  const engagements = await listEngagements(adapter, { capexProjetId: opts.sectionProjetId });

  const engage = engagements.reduce((s, e) => s + engagementRestant(e), 0);
  const facture = engagements.reduce((s, e) => s + (e.montant_facture || 0), 0);

  // Fournisseurs — agrégés depuis les engagements (source réelle du lien fournisseur ↔ CAPEX).
  const byFour = new Map<string, CarFournisseurLigne>();
  for (const e of engagements) {
    const key = (e.fournisseur_libelle || '—').trim() || '—';
    if (!byFour.has(key)) byFour.set(key, { libelle: key, engage: 0, facture: 0, nbEngagements: 0 });
    const f = byFour.get(key)!;
    f.engage += engagementRestant(e);
    f.facture += e.montant_facture || 0;
    f.nbEngagements += 1;
  }
  const fournisseurs = [...byFour.values()].sort((a, b) => (b.engage + b.facture) - (a.engage + a.facture));

  // Factures — via les rapprochements engagement ↔ ligne d'écriture, puis lecture du GL.
  const factures: CarFactureLigne[] = [];
  if (engagements.length) {
    const { data: rapp } = await client
      .from('engagement_rapprochements')
      .select('engagement_id,journal_line_id,montant')
      .in('engagement_id', engagements.map((e) => e.id));
    const lineIds = [...new Set((rapp || []).map((r: any) => r.journal_line_id).filter(Boolean))];
    if (lineIds.length) {
      const { data: lines } = await client
        .from('journal_lines')
        .select('id,account_code,account_name,third_party_name,label,debit,credit,journal_entries(date,entry_number,status)')
        .in('id', lineIds);
      const engById = new Map(engagements.map((e) => [e.id, e]));
      for (const r of (rapp || [])) {
        const l = (lines || []).find((x: any) => x.id === r.journal_line_id);
        if (!l) continue;
        const je = (l as any).journal_entries;
        if (je?.status === 'draft') continue; // les brouillons ne sont pas des factures constatées
        const eng = engById.get(r.engagement_id);
        factures.push({
          journalLineId: l.id,
          date: je?.date ?? null,
          piece: je?.entry_number ?? null,
          libelle: l.label ?? null,
          accountCode: l.account_code ?? null,
          montant: Number(r.montant) || (Number(l.debit) || 0) - (Number(l.credit) || 0),
          // Le tiers porté par la ligne d'écriture prime sur le libellé saisi à l'engagement.
          fournisseur: (l as any).third_party_name || eng?.fournisseur_libelle || null,
          engagementRef: eng?.reference_document || eng?.external_ref || null,
        });
      }
      factures.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
    }
  }

  // Réalisé GL (immobilisation effectivement constatée sur la section projet).
  let realiseGl = 0;
  if (opts.sectionCode) {
    const { data: rs } = await client.from('v_actual_by_section')
      .select('classe,montant').eq('section_code', opts.sectionCode).eq('annee', opts.annee);
    for (const r of (rs || [])) if (String(r.classe) === '2') realiseGl += Number(r.montant) || 0;
  }

  return { approprie: opts.approprie, engage, facture, realiseGl, engagements, fournisseurs, factures, sansProjet: false };
}
