import React from 'react';
import { ATLAS_SERIES, ATLAS_INK, ATLAS_INK2, FONT_SANS, FONT_MONO } from './theme';

export interface ProgressItem {
  label: string;
  /** valeur 0–100 */
  value: number;
  /** dégradé : couleur de départ → fin (défaut : palette Atlas par index) */
  from?: string;
  to?: string;
}

export interface AtlasProgressProps {
  items: ProgressItem[];
  className?: string;
}

/**
 * Progress bars « Daylight Pro » : pilules arrondies dégradées sur piste claire,
 * label + valeur. Pur CSS (pas de canvas), tokens Atlas.
 */
const AtlasProgress: React.FC<AtlasProgressProps> = ({ items, className }) => (
  <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {items.map((it, i) => {
      const from = it.from || ATLAS_SERIES[i % ATLAS_SERIES.length];
      const to = it.to || ATLAS_SERIES[(i + 1) % ATLAS_SERIES.length];
      const v = Math.max(0, Math.min(100, it.value));
      return (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600, color: ATLAS_INK2 }}>{it.label}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700, color: ATLAS_INK }}>{v}%</span>
          </div>
          <div style={{ height: 14, borderRadius: 999, background: 'var(--color-border-light, #F0EBE0)', overflow: 'hidden' }}>
            <div style={{ width: `${v}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${from}, ${to})`, transition: 'width .5s cubic-bezier(.16,1,.3,1)' }} />
          </div>
        </div>
      );
    })}
  </div>
);

export default AtlasProgress;
