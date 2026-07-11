import type { DataAdapter } from '@atlas/data';

/**
 * PIR — revue post-implémentation (refonte OPEX/CAPEX — Lot 6, §22.1).
 * Table capex_pir (tenant_id). Compare l'investissement final vs approprié vs BC,
 * le délai réel, les bénéfices constatés, la VAN ex-post, les leçons apprises.
 */
export interface Pir {
  id?: string; projet_id: string; request_id: string | null;
  cout_final: number | null; ecart_approprie: number | null; van_ex_post: number | null;
  delai_reel_jours: number | null; benefices_constates: number | null; lecons: string | null;
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}

export async function getPir(adapter: DataAdapter, projetId: string): Promise<Pir | null> {
  const client = getClient(adapter);
  if (!client) return null;
  const { data } = await client.from('capex_pir').select('*').eq('projet_id', projetId).limit(1);
  if (!data?.[0]) return null;
  const r = data[0];
  return {
    id: r.id, projet_id: r.projet_id, request_id: r.request_id,
    cout_final: r.cout_final != null ? Number(r.cout_final) : null,
    ecart_approprie: r.ecart_approprie != null ? Number(r.ecart_approprie) : null,
    van_ex_post: r.van_ex_post != null ? Number(r.van_ex_post) : null,
    delai_reel_jours: r.delai_reel_jours, benefices_constates: r.benefices_constates != null ? Number(r.benefices_constates) : null,
    lecons: r.lecons,
  };
}

export async function savePir(adapter: DataAdapter, projetId: string, requestId: string | null, pir: Partial<Pir>): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('SaaS uniquement.');
  const tenant = await tenantOf(client);
  const { data: u } = await client.auth.getUser();
  const row: any = {
    tenant_id: tenant, projet_id: projetId, request_id: requestId,
    cout_final: pir.cout_final ?? null, ecart_approprie: pir.ecart_approprie ?? null, van_ex_post: pir.van_ex_post ?? null,
    delai_reel_jours: pir.delai_reel_jours ?? null, benefices_constates: pir.benefices_constates ?? null, lecons: pir.lecons ?? null,
    reviewed_by: u?.user?.id ?? null, reviewed_at: new Date().toISOString(),
  };
  const { error } = await client.from('capex_pir').upsert(row, { onConflict: 'tenant_id,projet_id' });
  if (error) throw new Error(error.message);
}
