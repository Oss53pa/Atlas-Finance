import React, { useId } from 'react';
import { ATLAS_PETROL } from './theme';

export interface AtlasSparklineProps {
  data: number[];
  color?: string;
  /** aplat dégradé sous la courbe (défaut : oui) */
  area?: boolean;
  /** point marqué sur la dernière valeur */
  showLast?: boolean;
  strokeWidth?: number;
  height?: number;
  className?: string;
  /** description accessible ; sans elle le tracé est masqué aux lecteurs d'écran */
  title?: string;
}

/**
 * Sparkline « Daylight Pro » : SVG pur, aucune dépendance graphique.
 * Une carte KPI n'a pas besoin d'un moteur de rendu complet — les tableaux de
 * bord en affichent des dizaines, et un canvas par carte coûte cher pour une
 * courbe de 12 points. Le tracé s'étire au conteneur (viewBox + preserveAspectRatio).
 */
const AtlasSparkline: React.FC<AtlasSparklineProps> = ({
  data, color = ATLAS_PETROL, area = true, showLast = false,
  strokeWidth = 2, height = 32, className, title,
}) => {
  const gid = useId();
  if (!data || data.length < 2) return null;

  // Repère interne fixe : le viewBox se charge de la mise à l'échelle réelle.
  const W = 100, H = 32, PAD = strokeWidth;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  const fill = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg
      className={className}
      width="100%"
      height={height}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {area && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={fill} fill={`url(#${gid})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showLast && (
        <circle
          cx={W} cy={y(data[data.length - 1])} r={strokeWidth}
          fill={color} stroke="#fff" strokeWidth={strokeWidth / 2}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
};

export default AtlasSparkline;
