/**
 * Badge « Espace lié » / « Ouvrir un espace » (bidirectionnalité CDC §4.1).
 * À poser sur tout écran métier ancrable (rapprochement, grand livre, balance
 * âgée…). Affiche les espaces de résolution ancrés à l'objet courant (nombre +
 * convergence), cliquables ; sinon un CTA d'ouverture pré-remplie.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Plus, Target } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { findSpacesForAnchor } from '../services/collaborationService';
import { openSpaceUrl, newSpaceUrl, type NewSpaceContext } from '../link';
import type { Space } from '../types';

interface Props {
  /** Contexte d'ancrage servant au matching ET au pré-remplissage de création. */
  context: NewSpaceContext;
  /** Filtre de recherche des espaces liés (défaut : dérivé du contexte). */
  match?: { accountCode?: string; partnerId?: string; entryId?: string };
  compact?: boolean;
}

export const SpaceLinkBadge: React.FC<Props> = ({ context, match, compact }) => {
  const { adapter } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const tenantId = user?.company_id || (typeof localStorage !== 'undefined' && localStorage.getItem('atlas-tenant-id')) || 'default';
  const [linked, setLinked] = useState<Space[]>([]);

  const m = match || { accountCode: context.accountCode, partnerId: context.partnerId, entryId: context.entryId };

  useEffect(() => {
    let alive = true;
    findSpacesForAnchor(adapter, tenantId, m)
      .then(s => { if (alive) setLinked(s); })
      .catch(() => {});
    return () => { alive = false; };
  }, [adapter, tenantId, m.accountCode, m.partnerId, m.entryId]);

  if (linked.length > 0) {
    const active = linked.filter(s => s.status !== 'archive' && s.status !== 'abandonne');
    const top = active[0] || linked[0];
    const conv = top.convergenceBp != null ? Math.round(top.convergenceBp / 100) : null;
    return (
      <button
        onClick={() => navigate(openSpaceUrl(top.id))}
        title={`${linked.length} espace(s) de résolution lié(s) à cet objet`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
          color: '#1E5A64', background: '#1E5A6414', border: '1px solid #1E5A6433', borderRadius: 8,
          padding: compact ? '3px 9px' : '5px 11px', cursor: 'pointer',
        }}
      >
        <Link2 size={13} />
        {linked.length > 1 ? `${linked.length} espaces liés` : 'Espace lié'}
        {conv != null && <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C97E12' }}>· {conv}%</span>}
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate(newSpaceUrl(context))}
      title="Ouvrir un espace de résolution ancré à cet objet"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
        color: '#E8912D', background: '#E8912D12', border: '1px dashed #E8912D66', borderRadius: 8,
        padding: compact ? '3px 9px' : '5px 11px', cursor: 'pointer',
      }}
    >
      <Target size={13} /> Ouvrir un espace <Plus size={12} />
    </button>
  );
};

export default SpaceLinkBadge;
