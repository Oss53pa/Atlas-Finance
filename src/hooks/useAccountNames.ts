/**
 * useAccountNames — charge le plan de comptes du tenant UNE fois et expose des
 * helpers d'affichage « code → libellé » qui priorisent le nom RÉEL du tenant
 * (accounts.name) et retombent sur le référentiel SYSCOHADA.
 *
 * Usage :
 *   const { format } = useAccountNames();
 *   <span>{format(asset.accountCode)}</span>   // « 235100 — Aménagements RDC »
 *
 * Le lookup du nom tenant est EXACT (par code complet) ; pour un code agrégé
 * (ex. « 235 » sans compte exact), on retombe naturellement sur le référentiel.
 */
import { useEffect, useState, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { formatAccountWithLabel, getAccountLabel } from '../utils/accountLabels';

export function useAccountNames() {
  const { adapter } = useData();
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    adapter.getAll<any>('accounts')
      .then((accs) => {
        if (cancelled) return;
        const m = new Map<string, string>();
        (accs || []).forEach((a: any) => {
          const c = String(a.code ?? '').trim();
          const n = String(a.name ?? a.libelle ?? '').trim();
          if (c && n) m.set(c, n);
        });
        setNames(m);
      })
      .catch(() => { /* plan indisponible → référentiel seul */ });
    return () => { cancelled = true; };
  }, [adapter]);

  /** Libellé seul (nom tenant si compte exact connu, sinon référentiel). */
  const label = useCallback(
    (code: string | number | null | undefined): string => {
      const c = String(code ?? '').trim();
      return names.get(c) || getAccountLabel(c);
    },
    [names],
  );

  /** « code — libellé » (nom tenant prioritaire, repli référentiel). */
  const format = useCallback(
    (code: string | number | null | undefined, sep = ' — '): string => {
      const c = String(code ?? '').trim();
      return formatAccountWithLabel(c, names.get(c), sep);
    },
    [names],
  );

  return { names, label, format };
}
