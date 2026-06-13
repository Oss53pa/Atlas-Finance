/**
 * PrintButton — bouton imprimante avec CHOIX d'orientation (A4 portrait/paysage).
 *
 * Au clic, ouvre un petit menu (Portrait / Paysage). L'orientation choisie est
 * transmise à `buildBody`, qui renvoie le HTML des données à imprimer ; le rendu
 * final est délégué à `printReport` (iframe isolée, mise en page A4 pro, en-tête
 * société + titre + date, strictement limité aux données).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Printer, ChevronDown } from 'lucide-react';
import { printReport, getCompanyName, type PrintOrientation } from '../../utils/printReport';
import { toast } from 'sonner';

export interface PrintButtonContent {
  title?: string;
  subtitle?: string;
  bodyHtml: string;
  company?: string;
}

export interface PrintButtonProps {
  /**
   * Produit le contenu à imprimer pour l'orientation choisie. `anchor` est le
   * bouton lui-même (utile pour remonter au conteneur de la page via closest()).
   * Peut être asynchrone (ex. déplier toutes les lignes avant capture).
   */
  buildBody: (orientation: PrintOrientation, anchor: HTMLElement) => PrintButtonContent | null | Promise<PrintButtonContent | null>;
  className?: string;
  title?: string;
}

const PrintButton: React.FC<PrintButtonProps> = ({ buildBody, className = '', title = 'Imprimer' }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const run = async (orientation: PrintOrientation) => {
    setOpen(false);
    if (busy) return;
    setBusy(true);
    try {
      const content = await buildBody(orientation, btnRef.current as HTMLElement);
      if (!content || !content.bodyHtml?.trim()) {
        toast.error('Aucune donnée à imprimer sur cet écran.');
        return;
      }
      const ok = printReport({
        orientation,
        title: content.title,
        subtitle: content.subtitle,
        bodyHtml: content.bodyHtml,
        company: content.company ?? getCompanyName() ?? undefined,
      });
      if (!ok) toast.error('Aucune donnée à imprimer sur cet écran.');
    } catch {
      toast.error("Erreur lors de la préparation de l'impression.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} className={`relative inline-flex print-hide ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={title}
        title={title}
        disabled={busy}
        className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors inline-flex items-center gap-1 disabled:opacity-60"
      >
        <Printer className="w-4 h-4" />
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 min-w-[170px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg py-1"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Imprimer en A4
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => run('portrait')}
            className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2"
          >
            <span className="inline-block w-3 h-4 border border-current rounded-[2px]" aria-hidden /> Portrait
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run('landscape')}
            className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2"
          >
            <span className="inline-block w-4 h-3 border border-current rounded-[2px]" aria-hidden /> Paysage
          </button>
        </div>
      )}
    </div>
  );
};

export default PrintButton;
