/**
 * AccountCombobox — sélecteur « n° de compte — libellé » (recherche + liste déroulante).
 *
 * Source des options : plan de comptes du tenant (`accounts`, nom réel prioritaire)
 * complété du référentiel SYSCOHADA, filtré sur une classe (ex. « 6 » pour les
 * charges, « 7 » pour les produits). La saisie libre reste possible (un code hors
 * liste est accepté) : le libellé connu s'affiche sous le champ.
 *
 * La liste est rendue en PORTAL (position fixed) : les grilles budgétaires vivent
 * dans un conteneur `overflow-x-auto` qui rognerait un dropdown en position absolue.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useAccountNames } from '../../hooks/useAccountNames';
import { SOUS_COMPTES_SYSCOHADA } from '../../data/syscohada-referentiel';

export type AccountOption = { code: string; libelle: string };

/**
 * Comptes proposés pour une classe : référentiel SYSCOHADA + plan du tenant
 * (le nom du tenant écrase le libellé standard sur un même code).
 */
export function useAccountOptions(classPrefix: string): AccountOption[] {
  const { names } = useAccountNames();
  return useMemo(() => {
    const map = new Map<string, string>();
    SOUS_COMPTES_SYSCOHADA
      .filter((sc) => sc.code.startsWith(classPrefix))
      .forEach((sc) => map.set(sc.code, sc.libelle));
    names.forEach((n, code) => { if (code.startsWith(classPrefix)) map.set(code, n); });
    return [...map.entries()]
      .map(([code, libelle]) => ({ code, libelle }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [names, classPrefix]);
}

interface Props {
  value: string;
  onChange: (code: string) => void;
  /**
   * Appelé UNE fois la valeur arrêtée (choix dans la liste ou sortie du champ) :
   * à utiliser quand le parent persiste (évite une écriture par frappe).
   */
  onCommit?: (code: string) => void;
  /** Classe SYSCOHADA à proposer (« 6 », « 7 », « 2 »…). */
  classPrefix: string;
  disabled?: boolean;
  placeholder?: string;
  /** Largeur du champ (classes Tailwind). */
  inputClassName?: string;
}

const AccountCombobox: React.FC<Props> = ({
  value, onChange, onCommit, classPrefix, disabled, placeholder = 'Compte…', inputClassName = 'w-28',
}) => {
  const options = useAccountOptions(classPrefix);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 200);
    return options
      .filter((o) => o.code.toLowerCase().startsWith(q) || o.libelle.toLowerCase().includes(q))
      .slice(0, 200);
  }, [options, query]);

  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) });
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    place();
    setActive(0);
    setOpen(true);
  }, [disabled, place]);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node) || listRef.current?.contains(e.target as Node)) return;
      close();
    };
    const onScroll = () => place();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, close, place]);

  // Valeur en cours de frappe, arrêtée au choix dans la liste ou à la sortie du
  // champ : le parent qui persiste (onCommit) n'écrit pas une fois par frappe.
  const pending = useRef(value);
  const dirty = useRef(false);

  const commit = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    onCommit?.(pending.current);
  }, [onCommit]);

  const select = useCallback((o: AccountOption) => {
    pending.current = o.code;
    dirty.current = true;
    onChange(o.code);
    commit();
    close();
    inputRef.current?.blur();
  }, [onChange, commit, close]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) return openList();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[active]) { e.preventDefault(); select(filtered[active]); }
    } else if (e.key === 'Escape') {
      close();
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative inline-flex items-center">
        <input
          ref={inputRef}
          value={open ? query : value}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={openList}
          onClick={openList}
          onChange={(e) => {
            pending.current = e.target.value; dirty.current = true;
            setQuery(e.target.value); onChange(e.target.value); setActive(0);
            if (!open) openList();
          }}
          onBlur={commit}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className={`${inputClassName} pr-6 px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] font-mono text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-60`}
        />
        <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 pointer-events-none text-[var(--color-text-tertiary)]" />
      </div>

      {open && rect && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width, maxHeight: 280 }}
          className="z-[60] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[var(--color-text-tertiary)]">Aucun compte de classe {classPrefix} ne correspond.</li>
          ) : filtered.map((o, i) => (
            <li
              key={o.code}
              role="option"
              aria-selected={o.code === value}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); select(o); }}
              className={`px-3 py-1.5 cursor-pointer text-xs flex items-baseline gap-2 ${
                i === active ? 'bg-[var(--color-primary-light)]' : ''
              }`}
            >
              <span className="font-mono text-[var(--color-text-primary)]">{o.code}</span>
              <span className="text-[var(--color-text-secondary)] truncate">{o.libelle}</span>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
};

export default AccountCombobox;
