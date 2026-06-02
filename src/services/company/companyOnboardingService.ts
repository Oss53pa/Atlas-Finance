/**
 * companyOnboardingService — sauvegarde des données entreprise saisies au
 * premier accès (modal d'onboarding). Réplique fidèlement la logique de
 * `AdminCompany.saveSetting` afin que les données atterrissent au MÊME endroit
 * canonique (`settings.admin_company_legal`) et soient donc lisibles/éditables
 * ensuite dans l'Espace Admin → « Société & Comptabilité ».
 *
 * - mode saas  : RPC `upsert_setting` (tenant_id dérivé serveur) + sync `societes`
 *                via `update_societe_legal` pour la clé admin_company_legal.
 * - mode local : upsert direct dans la table Dexie `settings`.
 */
import type { DataAdapter } from '@atlas/data';
import { supabase } from '../../lib/supabase';

/** Jeu de champs légaux complet (identique à DEFAULT_LEGAL d'AdminCompany). */
export const DEFAULT_COMPANY_LEGAL = {
  raisonSociale: '',
  formeJuridique: 'SARL',
  nif: '',
  rccm: '',
  capitalSocial: '',
  regimeFiscal: 'Reel normal',
  adresse: '',
  ville: '',
  pays: "Cote d'Ivoire",
  telephone: '',
  email: '',
  siteWeb: '',
};

export type CompanyLegal = typeof DEFAULT_COMPANY_LEGAL;

/** Forme par défaut du setting devise (identique à deviseForm d'AdminCompany). */
export const DEFAULT_COMPANY_DEVISE = {
  devise: 'XOF',
  pays: "Cote d'Ivoire",
  fuseau: 'Africa/Abidjan',
  formatNombre: '1 000 000',
  separateurDecimal: 'virgule',
};

/**
 * Upsert d'un setting entreprise. Pour `admin_company_legal`, synchronise aussi
 * la table `societes` (source de vérité du nom) en mode saas.
 */
export async function saveCompanySetting(
  adapter: DataAdapter,
  key: string,
  value: unknown,
): Promise<void> {
  const serialized = JSON.stringify(value);

  if (adapter.getMode() === 'saas') {
    const { error } = await (supabase as any).rpc('upsert_setting', {
      p_key: key,
      p_value: serialized,
    });
    if (error) throw new Error(error.message);

    if (key === 'admin_company_legal') {
      const { error: soErr } = await (supabase as any).rpc('update_societe_legal', { p_data: value });
      if (soErr) console.error('[onboarding] societes sync error:', soErr.message);
    }
    return;
  }

  // Mode local (Dexie)
  const data = { key, value: serialized, updatedAt: new Date().toISOString() };
  try {
    const existing = await adapter.getById<any>('settings', key);
    if (existing) { await adapter.update('settings' as any, key, data as any); }
    else { await adapter.create('settings' as any, data as any); }
  } catch {
    try { await adapter.create('settings' as any, data as any); } catch { /* silent */ }
  }
}

/** Lit le setting admin_company_legal (ou null). Sert à détecter le premier accès. */
export async function getCompanyLegal(adapter: DataAdapter): Promise<CompanyLegal | null> {
  try {
    const row = await adapter.getById<any>('settings', 'admin_company_legal');
    return row?.value ? (JSON.parse(row.value) as CompanyLegal) : null;
  } catch {
    return null;
  }
}

/** Crée l'exercice fiscal d'ouverture (mirroir de handleExerciceSubmit d'AdminCompany). */
export async function createFiscalYear(
  adapter: DataAdapter,
  opts: { debut: string; fin: string; code: string },
): Promise<void> {
  await adapter.create('fiscalYears' as any, {
    code: opts.code,
    name: `Exercice ${opts.code}`,
    // camelCase — DexieAdapter (local)
    startDate: opts.debut,
    endDate: opts.fin,
    isClosed: false,
    isActive: true,
    // snake_case — SupabaseAdapter (saas)
    start_date: opts.debut,
    end_date: opts.fin,
    is_closed: false,
    is_active: true,
    periodes: 12,
    periods: 12,
  } as any);
}

/**
 * Enregistre l'onboarding complet : infos légales essentielles + devise +
 * exercice d'ouverture. La création de l'exercice est best-effort (non bloquante).
 */
export async function saveCompanyOnboarding(
  adapter: DataAdapter,
  input: {
    raisonSociale: string;
    formeJuridique: string;
    pays: string;
    devise: string;
    exerciceDebut: string; // 'YYYY-MM-DD'
  },
): Promise<void> {
  // 1) Infos légales (clé canonique)
  const legal: CompanyLegal = {
    ...DEFAULT_COMPANY_LEGAL,
    raisonSociale: input.raisonSociale.trim(),
    formeJuridique: input.formeJuridique,
    pays: input.pays,
  };
  await saveCompanySetting(adapter, 'admin_company_legal', legal);

  // 2) Devise
  await saveCompanySetting(adapter, 'admin_company_devise', {
    ...DEFAULT_COMPANY_DEVISE,
    devise: input.devise,
    pays: input.pays,
  });

  // 3) Exercice d'ouverture (best-effort)
  try {
    const d = new Date(input.exerciceDebut);
    if (!isNaN(d.getTime())) {
      const finD = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
      finD.setDate(finD.getDate() - 1);
      const fin = finD.toISOString().slice(0, 10);
      await createFiscalYear(adapter, { debut: input.exerciceDebut, fin, code: String(d.getFullYear()) });
    }
  } catch (err) {
    console.error('[onboarding] création exercice échouée (non bloquant):', err);
  }
}
