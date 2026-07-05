import React from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  status?: 'online' | 'away' | 'offline';
  className?: string;
  title?: string;
}

const SIZES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const STATUS_COLOR: Record<NonNullable<AvatarProps['status']>, string> = {
  online: 'bg-green-500',
  away: 'bg-amber-500',
  offline: 'bg-gray-300',
};

// Couleur déterministe dérivée du nom (stable entre rendus).
const PALETTE = ['#235A6E', '#E89A2E', '#4E7E8D', '#1D9E75', '#C77E2C', '#7C6BAF', '#B5546A', '#2E7D9A'];
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/[\s/._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ name = '', src, size = 'md', status, className, title }) => {
  const label = title || name;
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none', SIZES[size], className)}
      style={{ background: src ? undefined : colorFor(name || '?') }}
      title={label}
      aria-label={label}
    >
      {src ? (
        <img src={src} alt={label} className="w-full h-full rounded-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
      {status && (
        <span className={cn('absolute -bottom-0 -right-0 rounded-full ring-2 ring-white', STATUS_COLOR[status], size === 'xs' ? 'w-2 h-2' : 'w-2.5 h-2.5')} />
      )}
    </span>
  );
};

export default Avatar;
