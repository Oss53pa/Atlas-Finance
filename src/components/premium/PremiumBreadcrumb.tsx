import React from 'react';
import { Home, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

const PremiumBreadcrumb: React.FC<{ items: BreadcrumbItem[]; rootIcon?: React.ReactNode }> = ({
  items, rootIcon,
}) => {
  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm">
      {rootIcon !== undefined && (
        <>
          <span className="inline-flex items-center justify-center" style={{ color: 'var(--color-text-tertiary)' }}>
            {rootIcon ?? <Home className="w-3.5 h-3.5" />}
          </span>
          <ChevronRight className="w-3 h-3" style={{ color: 'var(--color-text-quaternary)' }} />
        </>
      )}
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        const Comp: any = it.href ? 'a' : it.onClick ? 'button' : 'span';
        return (
          <React.Fragment key={i}>
            <Comp
              href={it.href}
              onClick={it.onClick}
              className="transition-colors"
              style={{
                color: isLast ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                fontWeight: isLast ? 600 : 500,
                letterSpacing: '-0.005em',
                cursor: it.href || it.onClick ? 'pointer' : 'default',
              }}
              onMouseEnter={(e: any) => { if (!isLast && (it.href || it.onClick)) e.currentTarget.style.color = 'var(--color-accent-deep)'; }}
              onMouseLeave={(e: any) => { if (!isLast && (it.href || it.onClick)) e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
            >
              {it.label}
            </Comp>
            {!isLast && <ChevronRight className="w-3 h-3" style={{ color: 'var(--color-text-quaternary)' }} />}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default PremiumBreadcrumb;
