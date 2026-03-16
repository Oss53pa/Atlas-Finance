import { useState, useEffect, useRef, useCallback } from "react";

// ═══ TYPES ═══════════════════════════════════════════

export interface CatalogItem {
  id: string;
  label: string;
  category: string;
  type: "kpi" | "chart" | "table" | "widget";
  description?: string;
}

export interface EasyViewBIProps {
  initialTab?: string;
  selectedItems?: string[];
  onSelectionChange?: (items: CatalogItem[]) => void;
}

// ═══ CATALOGUE DES ELEMENTS ═════════════════════════

const CATEGORIES = [
  { key: "kpis", label: "Indicateurs KPI", icon: "📊" },
  { key: "charts", label: "Graphiques", icon: "📈" },
  { key: "tables", label: "Tableaux", icon: "📋" },
  { key: "widgets", label: "Widgets", icon: "🧩" },
] as const;

const CATALOG: CatalogItem[] = [
  // KPIs
  { id: "kpi-ca", label: "Chiffre d'Affaires", category: "kpis", type: "kpi", description: "CA annuel avec tendance vs N-1" },
  { id: "kpi-resultat", label: "Resultat Net", category: "kpis", type: "kpi", description: "Resultat net avec evolution" },
  { id: "kpi-tresorerie", label: "Tresorerie Nette", category: "kpis", type: "kpi", description: "Position de tresorerie" },
  { id: "kpi-ebitda", label: "EBITDA", category: "kpis", type: "kpi", description: "Excedent brut d'exploitation" },
  { id: "kpi-bfr", label: "BFR", category: "kpis", type: "kpi", description: "Besoin en fonds de roulement" },
  { id: "kpi-fr", label: "Fonds de Roulement", category: "kpis", type: "kpi", description: "Fonds de roulement net" },
  { id: "kpi-endettement", label: "Ratio Endettement", category: "kpis", type: "kpi", description: "Taux d'endettement global" },
  { id: "kpi-roe", label: "ROE", category: "kpis", type: "kpi", description: "Retour sur capitaux propres" },
  { id: "kpi-masse-salariale", label: "Masse Salariale", category: "kpis", type: "kpi", description: "Total masse salariale annuelle" },
  { id: "kpi-effectif", label: "Effectif Total", category: "kpis", type: "kpi", description: "Nombre d'employes actifs" },
  { id: "kpi-charges", label: "Charges Totales", category: "kpis", type: "kpi", description: "Total des charges d'exploitation" },
  { id: "kpi-marge-brute", label: "Marge Brute", category: "kpis", type: "kpi", description: "Marge brute avec %" },
  { id: "kpi-dso", label: "DSO", category: "kpis", type: "kpi", description: "Delai moyen encaissement clients" },
  { id: "kpi-dpo", label: "DPO", category: "kpis", type: "kpi", description: "Delai moyen paiement fournisseurs" },
  { id: "kpi-flux-exploit", label: "Flux Exploitation", category: "kpis", type: "kpi", description: "Cash-flow operationnel" },
  { id: "kpi-flux-invest", label: "Flux Investissement", category: "kpis", type: "kpi", description: "Cash-flow d'investissement" },

  // Charts
  { id: "chart-revenus-charges", label: "Revenus vs Charges vs Resultat", category: "charts", type: "chart", description: "Evolution mensuelle P&L" },
  { id: "chart-structure-bilan", label: "Structure Bilan", category: "charts", type: "chart", description: "Repartition actif (donut)" },
  { id: "chart-cascade-pl", label: "Cascade P&L", category: "charts", type: "chart", description: "Waterfall formation du resultat" },
  { id: "chart-cashflow", label: "Cash-Flow Mensuel", category: "charts", type: "chart", description: "Encaissements vs decaissements" },
  { id: "chart-tresorerie-cumul", label: "Tresorerie Cumulee", category: "charts", type: "chart", description: "Evolution de la tresorerie" },
  { id: "chart-flux-nature", label: "Flux par Nature", category: "charts", type: "chart", description: "Exploitation / Investissement / Financement" },
  { id: "chart-charges-fix-var", label: "Charges Fixes vs Variables", category: "charts", type: "chart", description: "Structure des charges empilees" },
  { id: "chart-charges-nature", label: "Repartition Charges", category: "charts", type: "chart", description: "Par nature (donut)" },
  { id: "chart-ca-segment", label: "CA par Segment", category: "charts", type: "chart", description: "Retail, B2B, Export, Services..." },
  { id: "chart-ca-budget", label: "CA Reel vs Budget", category: "charts", type: "chart", description: "Comparaison mensuelle" },
  { id: "chart-aging-clients", label: "Aging Creances Clients", category: "charts", type: "chart", description: "Balance agee clients" },
  { id: "chart-aging-fourn", label: "Aging Dettes Fournisseurs", category: "charts", type: "chart", description: "Balance agee fournisseurs" },
  { id: "chart-dso-dpo", label: "DSO vs DPO", category: "charts", type: "chart", description: "Delais de paiement" },
  { id: "chart-masse-salariale", label: "Masse Salariale Mensuelle", category: "charts", type: "chart", description: "Salaires bruts + charges sociales" },
  { id: "chart-dept-rh", label: "Repartition par Departement", category: "charts", type: "chart", description: "Effectifs par departement" },
  { id: "chart-ca-centre", label: "CA par Centre de Profit", category: "charts", type: "chart", description: "Realise vs budget analytique" },
  { id: "chart-marge-centre", label: "Marge par Centre", category: "charts", type: "chart", description: "Rentabilite par centre" },
  { id: "chart-evolution-marges", label: "Evolution Marges (%)", category: "charts", type: "chart", description: "Marge brute et nette mensuelle" },
  { id: "chart-structure-passif", label: "Structure Passif", category: "charts", type: "chart", description: "Cap. propres, dettes (donut)" },
  { id: "chart-bfr-fr-tn", label: "Evolution BFR / FR / TN", category: "charts", type: "chart", description: "Equilibre financier mensuel" },
  { id: "chart-top-clients", label: "Top 5 Clients", category: "charts", type: "chart", description: "Barres horizontales CA" },
  { id: "chart-achats-categorie", label: "Achats par Categorie", category: "charts", type: "chart", description: "Repartition achats (donut)" },
  { id: "chart-previsions-cash", label: "Cash-Flow & Previsions", category: "charts", type: "chart", description: "Reel + projections" },

  // Tables
  { id: "table-fournisseurs", label: "Fournisseurs", category: "tables", type: "table", description: "Encours, aging, DPO, statut" },
  { id: "table-clients", label: "Clients", category: "tables", type: "table", description: "CA, creances, DSO, risque" },
  { id: "table-personnel", label: "Personnel", category: "tables", type: "table", description: "Matricule, salaire, statut" },
  { id: "table-charges", label: "Charges", category: "tables", type: "table", description: "Par compte, budget, ecarts" },
  { id: "table-produits", label: "Produits", category: "tables", type: "table", description: "CA par compte, realisation" },
  { id: "table-grand-livre", label: "Grand Livre", category: "tables", type: "table", description: "Ecritures comptables" },
  { id: "table-immobilisations", label: "Immobilisations", category: "tables", type: "table", description: "Amortissements, VNC" },
  { id: "table-tresorerie", label: "Tresorerie", category: "tables", type: "table", description: "Mouvements bancaires" },
  { id: "table-budget-reel", label: "Budget vs Reel", category: "tables", type: "table", description: "Ecarts budgetaires" },

  // Widgets
  { id: "widget-alertes", label: "Alertes & Echeances", category: "widgets", type: "widget", description: "TVA, cloture, emprunts, audit" },
  { id: "widget-top-comptes", label: "Top Comptes Actifs", category: "widgets", type: "widget", description: "Comptes les plus mouvementes" },
  { id: "widget-ratios", label: "Ratios Financiers", category: "widgets", type: "widget", description: "Liquidite, marge, DSO, DPO" },
  { id: "widget-positions-bancaires", label: "Positions Bancaires", category: "widgets", type: "widget", description: "Soldes par banque" },
  { id: "widget-encaiss-decaiss", label: "Encaissements vs Decaissements", category: "widgets", type: "widget", description: "Comparaison recente" },
];

// ═══ MINI PREVIEWS (thumbnails pour le catalogue) ════

const MONTHS = ["J","F","M","A","M","J","J","A","S","O","N","D"];

function MiniSpark({ data, color, w = 60, h = 20 }: { data: number[]; color: string; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - mn) / range) * (h - 4) - 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  }, [data, color, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ display: "block" }} />;
}

function MiniBar({ data, color, w = 60, h = 20 }: { data: number[]; color: string; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const mx = Math.max(...data);
    ctx.clearRect(0, 0, w, h);
    const bw = (w - (data.length - 1) * 1) / data.length;
    data.forEach((v, i) => {
      const bh = (v / mx) * (h - 2);
      ctx.fillStyle = color;
      ctx.fillRect(i * (bw + 1), h - bh, bw, bh);
    });
  }, [data, color, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ display: "block" }} />;
}

function MiniDonut({ segments, colors, w = 24, h = 24 }: { segments: number[]; colors: string[]; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const total = segments.reduce((a, b) => a + b, 0);
    const cx = w / 2, cy = h / 2, r = Math.min(cx, cy) - 1;
    let start = -Math.PI / 2;
    segments.forEach((v, i) => {
      const angle = (v / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.arc(cx, cy, r * 0.5, start + angle, start, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      start += angle;
    });
  }, [segments, colors, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ display: "block" }} />;
}

function TableIcon() {
  return (
    <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
      <rect x="1" y="1" width="22" height="18" rx="2" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
      <line x1="1" y1="7" x2="23" y2="7" stroke="#94a3b8" strokeWidth="1" />
      <line x1="1" y1="13" x2="23" y2="13" stroke="#94a3b8" strokeWidth="1" />
      <line x1="9" y1="1" x2="9" y2="19" stroke="#94a3b8" strokeWidth="1" />
    </svg>
  );
}

function WidgetIcon() {
  return (
    <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
      <rect x="1" y="1" width="10" height="8" rx="2" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
      <rect x="13" y="1" width="10" height="18" rx="2" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
      <rect x="1" y="11" width="10" height="8" rx="2" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// Thumbnail per item type
function ItemPreview({ item }: { item: CatalogItem }) {
  const sparkData = [3, 5, 4, 7, 6, 8, 7, 9, 8, 10, 9, 11];
  const barData = [5, 8, 4, 9, 7, 6];
  const donutData = [35, 25, 20, 20];
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  if (item.type === "kpi") {
    return <MiniSpark data={sparkData} color="#3b82f6" />;
  }
  if (item.type === "chart") {
    if (item.id.includes("donut") || item.id.includes("structure") || item.id.includes("repartition") || item.id.includes("categorie") || item.id.includes("nature") || item.id.includes("passif") || item.id.includes("dept") || item.id.includes("segment") || item.id.includes("flux-nature")) {
      return <MiniDonut segments={donutData} colors={colors} />;
    }
    if (item.id.includes("cascade") || item.id.includes("aging") || item.id.includes("top") || item.id.includes("encaiss") || item.id.includes("fix-var") || item.id.includes("masse") || item.id.includes("centre") || item.id.includes("marge-centre")) {
      return <MiniBar data={barData} color="#3b82f6" />;
    }
    return <MiniSpark data={sparkData} color="#10b981" />;
  }
  if (item.type === "table") {
    return <TableIcon />;
  }
  return <WidgetIcon />;
}

// ═══ COMPOSANT PRINCIPAL ════════════════════════════════

export default function EasyViewBI({ initialTab, selectedItems: initialSelected, onSelectionChange }: EasyViewBIProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected || []));
  const [search, setSearch] = useState("");

  const toggle = useCallback((item: CatalogItem) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }, []);

  const selectAll = useCallback((items: CatalogItem[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = items.every(i => next.has(i.id));
      if (allSelected) items.forEach(i => next.delete(i.id));
      else items.forEach(i => next.add(i.id));
      return next;
    });
  }, []);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const items = CATALOG.filter(i => selected.has(i.id));
      onSelectionChange(items);
    }
  }, [selected, onSelectionChange]);

  const filtered = CATALOG.filter(item => {
    if (activeCategory !== "all" && item.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.label.toLowerCase().includes(q) || (item.description || "").toLowerCase().includes(q);
    }
    return true;
  });

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: filtered.filter(i => i.category === cat.key),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Catalogue d'elements
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Selectionnez les elements a inclure dans votre rapport
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <span className="text-sm font-medium text-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 px-3 py-1 rounded-full">
              {selected.size} selectionne{selected.size > 1 ? "s" : ""}
            </span>
          )}
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline"
            >
              Tout deselectionner
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -tranprimary-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un element..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-background-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30 focus:border-[var(--color-brand-primary)]"
          />
        </div>
        <div className="flex gap-1 bg-[var(--color-background-secondary)] rounded-lg p-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeCategory === "all"
                ? "bg-[var(--color-background-primary)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Tout ({CATALOG.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = CATALOG.filter(i => i.category === cat.key).length;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeCategory === cat.key
                    ? "bg-[var(--color-background-primary)] text-[var(--color-text-primary)] shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {cat.icon} {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog grid by category */}
      {grouped.map(group => (
        <div key={group.key}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <span>{group.icon}</span>
              {group.label}
              <span className="text-xs font-normal text-[var(--color-text-tertiary)]">({group.items.length})</span>
            </h4>
            <button
              onClick={() => selectAll(group.items)}
              className="text-xs text-[var(--color-brand-primary)] hover:underline"
            >
              {group.items.every(i => selected.has(i.id)) ? "Tout deselectionner" : "Tout selectionner"}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-6">
            {group.items.map(item => {
              const isSelected = selected.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item)}
                  className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left cursor-pointer hover:shadow-md ${
                    isSelected
                      ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/5 shadow-sm"
                      : "border-[var(--color-border)] bg-[var(--color-background-primary)] hover:border-[var(--color-brand-primary)]/40"
                  }`}
                >
                  {/* Checkbox indicator */}
                  <div className={`absolute top-2 right-2 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]"
                      : "border-[var(--color-border)] group-hover:border-[var(--color-brand-primary)]/50"
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Preview thumbnail */}
                  <div className="w-full flex items-center justify-center h-8 mt-1">
                    <ItemPreview item={item} />
                  </div>

                  {/* Label */}
                  <div className="w-full text-center">
                    <div className="text-xs font-medium text-[var(--color-text-primary)] leading-tight line-clamp-2">
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1 leading-tight line-clamp-2">
                        {item.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">
          <p className="text-sm">Aucun element ne correspond a votre recherche.</p>
        </div>
      )}

      {/* Selection summary footer */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 bg-[var(--color-background-primary)] border-t border-[var(--color-border)] -mx-6 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-text-primary)]">{selected.size}</span> element{selected.size > 1 ? "s" : ""} selectionne{selected.size > 1 ? "s" : ""}
            <span className="mx-2">·</span>
            {CATEGORIES.map(cat => {
              const n = CATALOG.filter(i => i.category === cat.key && selected.has(i.id)).length;
              return n > 0 ? `${n} ${cat.label.toLowerCase()}` : null;
            }).filter(Boolean).join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}
