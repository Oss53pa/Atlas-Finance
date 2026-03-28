/**
 * AF-T06 — Réévaluation des créances/dettes en devises à la clôture.
 * SYSCOHADA : Écarts de conversion actif (476) et passif (477).
 *
 * À la clôture d'exercice :
 *  - Perte latente  → D 476 (ECA) / C 40x ou 41x
 *  - Gain latent    → D 40x ou 41x / C 477 (ECP)
 *
 * Extourne automatique en ouverture du nouvel exercice.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ReevaluationRequest {
  tenant_id: string;
  date_cloture: string;        // e.g. "2025-12-31"
  date_ouverture: string;      // e.g. "2026-01-01"
  taux_cloture: Record<string, number>; // e.g. { "EUR": 655.957, "USD": 610.50 }
}

interface EcritureConversion {
  account_code: string;
  label: string;
  debit: number;
  credit: number;
  currency: string;
}

serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ReevaluationRequest = await req.json();
    const { tenant_id, date_cloture, date_ouverture, taux_cloture } = body;

    if (!tenant_id || !date_cloture || !taux_cloture) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // 1. Retrieve open receivables/payables in foreign currencies
    //    Accounts 40x (fournisseurs) and 41x (clients) with currency info
    const { data: journalLines, error: linesError } = await supabase
      .from('journal_lines')
      .select('*, journal_entries!inner(id, date, status, tenant_id)')
      .eq('journal_entries.tenant_id', tenant_id)
      .in('journal_entries.status', ['validated', 'posted'])
      .or('account_code.like.40%,account_code.like.41%');

    if (linesError) {
      return new Response(JSON.stringify({ error: linesError.message }), { status: 500 });
    }

    // 2. Get historical exchange rates for each line
    const { data: historicalRates } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('date', { ascending: false });

    // Group open balances by account + currency
    const balances = new Map<string, { accountCode: string; currency: string; montantOrigine: number; tauxOrigine: number }>();

    for (const line of (journalLines || [])) {
      const currency = line.analytical_code?.match(/^[A-Z]{3}$/)?.[0];
      if (!currency || currency === 'XAF') continue;

      const key = `${line.account_code}_${currency}`;
      const existing = balances.get(key) || { accountCode: line.account_code, currency, montantOrigine: 0, tauxOrigine: 1 };
      existing.montantOrigine += (line.debit || 0) - (line.credit || 0);

      // Find the historical rate for this entry's date
      const entryDate = line.journal_entries?.date || date_cloture;
      const rate = (historicalRates || []).find(
        (r: any) => r.from_currency === currency && r.to_currency === 'XAF' && r.date <= entryDate
      );
      if (rate) existing.tauxOrigine = rate.rate;

      balances.set(key, existing);
    }

    // 3. Compute conversion differences
    const ecrituresCloture: EcritureConversion[] = [];
    const ecrituresExtourne: EcritureConversion[] = [];

    for (const [, balance] of balances) {
      if (Math.abs(balance.montantOrigine) < 0.01) continue;

      const tauxCloture = taux_cloture[balance.currency];
      if (!tauxCloture) continue;

      const valeurHistorique = Math.abs(balance.montantOrigine) * balance.tauxOrigine;
      const valeurCloture = Math.abs(balance.montantOrigine) * tauxCloture;
      const ecart = valeurCloture - valeurHistorique;

      if (Math.abs(ecart) < 1) continue; // Tolérance 1 FCFA

      const isCreance = balance.accountCode.startsWith('41'); // Client = créance
      const isDette = balance.accountCode.startsWith('40');   // Fournisseur = dette

      if (ecart < 0) {
        // Perte latente → ECA (476)
        // Pour une créance : la valeur a baissé → perte
        // Pour une dette : la valeur a baissé → gain (inversé)
        const isPerte = isCreance;
        if (isPerte) {
          ecrituresCloture.push(
            { account_code: '476', label: `ECA - ${balance.currency} ${balance.accountCode}`, debit: Math.abs(ecart), credit: 0, currency: balance.currency },
            { account_code: balance.accountCode, label: `Réévaluation ${balance.currency}`, debit: 0, credit: Math.abs(ecart), currency: balance.currency }
          );
        } else if (isDette) {
          ecrituresCloture.push(
            { account_code: balance.accountCode, label: `Réévaluation ${balance.currency}`, debit: Math.abs(ecart), credit: 0, currency: balance.currency },
            { account_code: '477', label: `ECP - ${balance.currency} ${balance.accountCode}`, debit: 0, credit: Math.abs(ecart), currency: balance.currency }
          );
        }
      } else {
        // Gain latent → ECP (477)
        const isGain = isCreance;
        if (isGain) {
          ecrituresCloture.push(
            { account_code: balance.accountCode, label: `Réévaluation ${balance.currency}`, debit: Math.abs(ecart), credit: 0, currency: balance.currency },
            { account_code: '477', label: `ECP - ${balance.currency} ${balance.accountCode}`, debit: 0, credit: Math.abs(ecart), currency: balance.currency }
          );
        } else if (isDette) {
          ecrituresCloture.push(
            { account_code: '476', label: `ECA - ${balance.currency} ${balance.accountCode}`, debit: Math.abs(ecart), credit: 0, currency: balance.currency },
            { account_code: balance.accountCode, label: `Réévaluation ${balance.currency}`, debit: 0, credit: Math.abs(ecart), currency: balance.currency }
          );
        }
      }
    }

    // 4. Generate extourne entries (reverse at opening)
    for (const ecriture of ecrituresCloture) {
      ecrituresExtourne.push({
        ...ecriture,
        label: `[Extourne] ${ecriture.label}`,
        debit: ecriture.credit,
        credit: ecriture.debit,
      });
    }

    // 5. Insert closing entries
    if (ecrituresCloture.length > 0) {
      const { error: insertError } = await supabase.from('journal_entries').insert({
        id: crypto.randomUUID(),
        tenant_id,
        date: date_cloture,
        label: `Réévaluation devises - Clôture ${date_cloture}`,
        reference: `REEVAL-CLO-${date_cloture}`,
        journal_code: 'OD',
        status: 'validated',
        lines: ecrituresCloture.map((l, i) => ({
          id: crypto.randomUUID(),
          lineNumber: i + 1,
          accountCode: l.account_code,
          label: l.label,
          debit: l.debit,
          credit: l.credit,
          analyticalCode: l.currency,
        })),
        total_debit: ecrituresCloture.reduce((s, l) => s + l.debit, 0),
        total_credit: ecrituresCloture.reduce((s, l) => s + l.credit, 0),
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        return new Response(JSON.stringify({ error: `Closing entry error: ${insertError.message}` }), { status: 500 });
      }

      // 6. Insert extourne entries at opening
      if (date_ouverture) {
        const { error: extourneError } = await supabase.from('journal_entries').insert({
          id: crypto.randomUUID(),
          tenant_id,
          date: date_ouverture,
          label: `Extourne réévaluation devises - Ouverture ${date_ouverture}`,
          reference: `REEVAL-EXT-${date_ouverture}`,
          journal_code: 'OD',
          status: 'validated',
          lines: ecrituresExtourne.map((l, i) => ({
            id: crypto.randomUUID(),
            lineNumber: i + 1,
            accountCode: l.account_code,
            label: l.label,
            debit: l.debit,
            credit: l.credit,
            analyticalCode: l.currency,
          })),
          total_debit: ecrituresExtourne.reduce((s, l) => s + l.debit, 0),
          total_credit: ecrituresExtourne.reduce((s, l) => s + l.credit, 0),
          created_at: new Date().toISOString(),
        });

        if (extourneError) {
          return new Response(JSON.stringify({ error: `Extourne entry error: ${extourneError.message}` }), { status: 500 });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      ecrituresCloture: ecrituresCloture.length / 2,
      ecrituresExtourne: ecrituresExtourne.length / 2,
      totalEcart: ecrituresCloture.reduce((s, l) => s + l.debit, 0),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
