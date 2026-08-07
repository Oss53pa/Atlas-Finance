
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const C = {
  bg: "#0B1120", card: "#111827", cardAlt: "#1a2332", border: "#1e293b",
  accent: "#235A6E", gold: "#d4a843", green: "#15803D", orange: "#E89A2E",
  red: "#C0322B", primary: "#a78bfa",
  t1: "#f1f5f9", t2: "#94a3b8", t3: "#64748b",
};

// Clés (et non libellés) : les tables sont figées au chargement du module ;
// rôles, usages et notes se résolvent au rendu.
const SCALES: Record<string, { labelKey: string; noteKey: string; base: number; levels: { roleKey: string; rem: string; pt: number; px: number; weight: number; line: number; spacing: string; useKey: string }[] }> = {
  print: {
    labelKey: "typographyGuide.scalePrint",
    noteKey: "typographyGuide.scalePrintNote",
    base: 16,
    levels: [
      { roleKey: "typographyGuide.roleH1", rem: "2.25rem", pt: 27, px: 36, weight: 700, line: 1.2, spacing: "-0.02em", useKey: "typographyGuide.useDocTitle" },
      { roleKey: "typographyGuide.roleH2", rem: "1.75rem", pt: 21, px: 28, weight: 700, line: 1.25, spacing: "-0.01em", useKey: "typographyGuide.useChapters" },
      { roleKey: "typographyGuide.roleH3", rem: "1.375rem", pt: 16.5, px: 22, weight: 600, line: 1.3, spacing: "0", useKey: "typographyGuide.useSubsections" },
      { roleKey: "typographyGuide.roleH4", rem: "1.125rem", pt: 13.5, px: 18, weight: 600, line: 1.35, spacing: "0", useKey: "typographyGuide.useTitledParas" },
      { roleKey: "typographyGuide.roleBody", rem: "1rem", pt: 12, px: 16, weight: 400, line: 1.6, spacing: "0", useKey: "typographyGuide.useBodyRef" },
      { roleKey: "typographyGuide.roleSecondary", rem: "0.875rem", pt: 10.5, px: 14, weight: 400, line: 1.5, spacing: "0", useKey: "typographyGuide.useNotes" },
      { roleKey: "typographyGuide.roleCaption", rem: "0.75rem", pt: 9, px: 12, weight: 400, line: 1.4, spacing: "0.01em", useKey: "typographyGuide.useFooter" },
      { roleKey: "typographyGuide.roleMicro", rem: "0.625rem", pt: 7.5, px: 10, weight: 400, line: 1.3, spacing: "0.02em", useKey: "typographyGuide.usePageNumbers" },
    ]
  },
  screen: {
    labelKey: "typographyGuide.scaleScreen",
    noteKey: "typographyGuide.scaleScreenNote",
    base: 16,
    levels: [
      { roleKey: "typographyGuide.rolePageH1", rem: "2rem", pt: 24, px: 32, weight: 700, line: 1.2, spacing: "-0.02em", useKey: "typographyGuide.useMainPage" },
      { roleKey: "typographyGuide.roleH2", rem: "1.5rem", pt: 18, px: 24, weight: 600, line: 1.25, spacing: "-0.01em", useKey: "typographyGuide.useDashboard" },
      { roleKey: "typographyGuide.roleH3", rem: "1.25rem", pt: 15, px: 20, weight: 600, line: 1.3, spacing: "0", useKey: "typographyGuide.useCards" },
      { roleKey: "typographyGuide.roleLabelH4", rem: "1rem", pt: 12, px: 16, weight: 600, line: 1.4, spacing: "0", useKey: "typographyGuide.useFieldLabels" },
      { roleKey: "typographyGuide.roleBody", rem: "0.9375rem", pt: 11.25, px: 15, weight: 400, line: 1.6, spacing: "0", useKey: "typographyGuide.useBodyRef" },
      { roleKey: "typographyGuide.roleTableText", rem: "0.875rem", pt: 10.5, px: 14, weight: 400, line: 1.5, spacing: "0", useKey: "typographyGuide.useTableCells" },
      { roleKey: "typographyGuide.roleBadge", rem: "0.75rem", pt: 9, px: 12, weight: 500, line: 1.4, spacing: "0.01em", useKey: "typographyGuide.useBadges" },
      { roleKey: "typographyGuide.roleMicroUi", rem: "0.625rem", pt: 7.5, px: 10, weight: 500, line: 1.3, spacing: "0.05em", useKey: "typographyGuide.useOverline" },
    ]
  },
  report: {
    labelKey: "typographyGuide.scaleReport",
    noteKey: "typographyGuide.scaleReportNote",
    base: 16,
    levels: [
      { roleKey: "typographyGuide.roleDocTitle", rem: "2.5rem", pt: 30, px: 40, weight: 700, line: 1.15, spacing: "-0.02em", useKey: "typographyGuide.useCoverOnly" },
      { roleKey: "typographyGuide.roleChapter", rem: "1.875rem", pt: 22.5, px: 30, weight: 700, line: 1.2, spacing: "-0.01em", useKey: "typographyGuide.useChapterNum" },
      { roleKey: "typographyGuide.roleH2", rem: "1.5rem", pt: 18, px: 24, weight: 600, line: 1.25, spacing: "0", useKey: "typographyGuide.useSectionNum" },
      { roleKey: "typographyGuide.roleSubsection", rem: "1.25rem", pt: 15, px: 20, weight: 600, line: 1.3, spacing: "0", useKey: "typographyGuide.useSubsectionNum" },
      { roleKey: "typographyGuide.roleTitledPara", rem: "1.0625rem", pt: 12.75, px: 17, weight: 600, line: 1.35, spacing: "0", useKey: "typographyGuide.useStepNote" },
      { roleKey: "typographyGuide.roleBody", rem: "1rem", pt: 12, px: 16, weight: 400, line: 1.7, spacing: "0", useKey: "typographyGuide.useBodyRef" },
      { roleKey: "typographyGuide.roleCode", rem: "0.875rem", pt: 10.5, px: 14, weight: 400, line: 1.5, spacing: "0", useKey: "typographyGuide.useCodeBlocks" },
      { roleKey: "typographyGuide.roleFootnote", rem: "0.75rem", pt: 9, px: 12, weight: 400, line: 1.4, spacing: "0", useKey: "typographyGuide.useReferences" },
    ]
  }
};

const FONTS = [
  { name: "Inter", typeKey: "typographyGuide.typeSans", bestKey: "typographyGuide.bestWebSaas", noteKey: "typographyGuide.fontInterNote" },
  { name: "Source Sans 3", typeKey: "typographyGuide.typeSans", bestKey: "typographyGuide.bestReports", noteKey: "typographyGuide.fontSourceNote" },
  { name: "Quicksand", typeKey: "typographyGuide.typeSans", bestKey: "typographyGuide.bestModernUi", noteKey: "typographyGuide.fontQuicksandNote" },
  { name: "Garamond", typeKey: "typographyGuide.typeSerif", bestKey: "typographyGuide.bestFormalReports", noteKey: "typographyGuide.fontGaramondNote" },
  { name: "Merriweather", typeKey: "typographyGuide.typeSerif", bestKey: "typographyGuide.bestLongDocs", noteKey: "typographyGuide.fontMerriweatherNote" },
  { name: "Fira Code", typeKey: "typographyGuide.typeMono", bestKey: "typographyGuide.bestCode", noteKey: "typographyGuide.fontFiraNote" },
  { name: "JetBrains Mono", typeKey: "typographyGuide.typeMono", bestKey: "typographyGuide.bestCode", noteKey: "typographyGuide.fontJetBrainsNote" },
  { name: "Sometype Mono", typeKey: "typographyGuide.typeMono", bestKey: "typographyGuide.bestTechUi", noteKey: "typographyGuide.fontSometypeNote" },
];

const RATIOS = [
  { name: "Minor Third", ratio: 1.2, vibeKey: "typographyGuide.vibeCompact", bestKey: "typographyGuide.ratioBestApps" },
  { name: "Major Third", ratio: 1.25, vibeKey: "typographyGuide.vibeBalanced", bestKey: "typographyGuide.ratioBestPro" },
  { name: "Perfect Fourth", ratio: 1.333, vibeKey: "typographyGuide.vibeAiry", bestKey: "typographyGuide.ratioBestReports" },
  { name: "Golden Ratio", ratio: 1.618, vibeKey: "typographyGuide.vibeDramatic", bestKey: "typographyGuide.ratioBestCovers" },
];

export default function TypographyGuide() {
  const { t } = useLanguage();
  const [activeScale, setActiveScale] = useState("print");
  const [showFonts, setShowFonts] = useState(false);
  const [showRatios, setShowRatios] = useState(false);

  const scale = SCALES[activeScale];

  return (
    <div style={{ background: C.bg, color: C.t1, minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px", color: C.t1 }}>{t("typographyGuide.title")}</h1>
        <p style={{ fontSize: 14, color: C.t2, margin: 0 }}>{t("typographyGuide.subtitle")}</p>
      </div>

      {/* Sélecteur de contexte */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {Object.entries(SCALES).map(([key, s]) => (
          <button key={key} onClick={() => setActiveScale(key)} style={{
            padding: "10px 18px", borderRadius: 8, border: `1px solid ${activeScale === key ? C.accent : C.border}`,
            background: activeScale === key ? C.accent + "20" : C.card, color: activeScale === key ? C.accent : C.t2,
            cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s"
          }}>
            {t(s.labelKey)}
          </button>
        ))}
      </div>

      {/* Info contexte */}
      <div style={{ background: C.card, borderRadius: 12, padding: 16, marginBottom: 24, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, color: C.t2 }}>{t(scale.noteKey)}</div>
        <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>
          {t("typographyGuide.baseLine", { px: String(scale.base), pt: String(scale.base * 0.75) })} &nbsp;|&nbsp;
          {t("typographyGuide.formulas")} <span style={{ color: C.gold }}>pt = px × 0.75</span> &nbsp;|&nbsp;
          <span style={{ color: C.primary }}>rem = px ÷ {scale.base}</span>
        </div>
      </div>

      {/* Table principale */}
      <div style={{ background: C.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.cardAlt }}>
              {[t("typographyGuide.colRole"), "rem", "pt", "px", t("typographyGuide.colWeight"), t("typographyGuide.colLineHeight"), t("typographyGuide.colSpacing"), t("typographyGuide.colUse")].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: C.t2, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scale.levels.map((l, i) => {
              const isBase = l.roleKey === "typographyGuide.roleBody";
              return (
                <tr key={i} style={{ background: isBase ? C.accent + "10" : "transparent", borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 14px", fontWeight: isBase ? 700 : 500, color: isBase ? C.accent : C.t1 }}>
                    {isBase && <span style={{ color: C.gold, marginRight: 6 }}>&#9733;</span>}
                    {t(l.roleKey)}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: C.primary, fontWeight: 600 }}>{l.rem}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: C.gold, fontWeight: 600 }}>{l.pt}pt</td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: C.green }}>{l.px}px</td>
                  <td style={{ padding: "10px 14px", color: C.t2 }}>{l.weight}</td>
                  <td style={{ padding: "10px 14px", color: C.t2 }}>{l.line}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: C.t3, fontSize: 11 }}>{l.spacing}</td>
                  <td style={{ padding: "10px 14px", color: C.t3, fontSize: 12 }}>{t(l.useKey)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Prévisualisation */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 40, marginBottom: 24, color: "#1a1a1a" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <p style={{ fontSize: 10, color: "#999", marginBottom: 24, textTransform: "uppercase", letterSpacing: "0.1em" }}>{t("typographyGuide.preview", { scale: t(scale.labelKey) })}</p>
          {scale.levels.map((l, i) => (
            <div key={i} style={{ marginBottom: i < scale.levels.length - 1 ? 16 : 0 }}>
              <p style={{
                fontSize: l.px, fontWeight: l.weight, lineHeight: l.line,
                letterSpacing: l.spacing, margin: 0, color: i >= 5 ? "#666" : "#1a1a1a",
                fontFamily: l.roleKey.includes("Code") ? "'Fira Code', monospace" : "'Inter', system-ui, sans-serif"
              }}>
                {t(l.roleKey)} — {l.pt}pt / {l.px}px
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Polices recommandées */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => setShowFonts(!showFonts)} style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 20px",
          color: C.t1, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%", textAlign: "left",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span>{t("typographyGuide.recommendedFonts")}</span>
          <span style={{ transform: showFonts ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>&#9660;</span>
        </button>
        {showFonts && (
          <div style={{ background: C.card, borderRadius: "0 0 12px 12px", border: `1px solid ${C.border}`, borderTop: "none", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.cardAlt }}>
                  {[t("typographyGuide.colFont"), t("typographyGuide.colType"), t("typographyGuide.colBestFor"), t("typographyGuide.colNotes")].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.t2, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FONTS.map((f, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: C.accent }}>{f.name}</td>
                    <td style={{ padding: "10px 14px", color: C.t2 }}>{t(f.typeKey)}</td>
                    <td style={{ padding: "10px 14px", color: C.gold }}>{t(f.bestKey)}</td>
                    <td style={{ padding: "10px 14px", color: C.t3, fontSize: 12 }}>{t(f.noteKey)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Échelles typographiques */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => setShowRatios(!showRatios)} style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 20px",
          color: C.t1, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%", textAlign: "left",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span>{t("typographyGuide.typeScales")}</span>
          <span style={{ transform: showRatios ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>&#9660;</span>
        </button>
        {showRatios && (
          <div style={{ background: C.card, borderRadius: "0 0 12px 12px", border: `1px solid ${C.border}`, borderTop: "none", padding: 20 }}>
            {RATIOS.map((r, i) => (
              <div key={i} style={{ marginBottom: 16, padding: 16, background: C.cardAlt, borderRadius: 8, border: r.name.includes("★") ? `1px solid ${C.gold}` : `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: r.name.includes("★") ? C.gold : C.t1 }}>{r.name}</span>
                  <span style={{ fontFamily: "monospace", color: C.primary }}>× {r.ratio}</span>
                </div>
                <div style={{ fontSize: 12, color: C.t3, marginBottom: 8 }}>{t(r.vibeKey)} — {t(r.bestKey)}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[0,1,2,3,4].map(n => {
                    const size = Math.round(16 * Math.pow(r.ratio, 4 - n));
                    return (
                      <span key={n} style={{ background: C.bg, padding: "4px 10px", borderRadius: 4, fontSize: 11, fontFamily: "monospace", color: C.t2 }}>
                        H{n+1}: {size}px
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formules de conversion */}
      <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: C.t1 }}>{t("typographyGuide.conversionFormulas")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
          {[
            { label: "px → pt", formula: "pt = px × 0.75", example: "16px = 12pt", color: C.gold },
            { label: "pt → px", formula: "px = pt ÷ 0.75", example: "12pt = 16px", color: C.green },
            { label: "px → rem", formula: "rem = px ÷ base", example: "24px = 1.5rem (base 16)", color: C.primary },
            { label: "rem → px", formula: "px = rem × base", example: "1.5rem = 24px (base 16)", color: C.accent },
            { label: "pt → rem", formula: "rem = pt ÷ (base × 0.75)", example: "18pt = 1.5rem", color: C.primary },
            { label: t("typographyGuide.lineHeightLabel"), formula: t("typographyGuide.lineHeightFormula"), example: t("typographyGuide.lineHeightExample"), color: C.orange },
          ].map((f, i) => (
            <div key={i} style={{ background: C.cardAlt, borderRadius: 8, padding: 14, borderLeft: `3px solid ${f.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: f.color, marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: 13, fontFamily: "monospace", color: C.t1, marginBottom: 4 }}>{f.formula}</div>
              <div style={{ fontSize: 11, color: C.t3 }}>{f.example}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Règles d'or */}
      <div style={{ marginTop: 24, background: C.gold + "15", borderRadius: 12, padding: 20, border: `1px solid ${C.gold}33` }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.gold, marginBottom: 12 }}>{t("typographyGuide.goldenRules")}</h3>
        <div style={{ display: "grid", gap: 8, fontSize: 13, color: C.t2 }}>
          {[
            t("typographyGuide.rule1"),
            t("typographyGuide.rule2"),
            t("typographyGuide.rule3"),
            t("typographyGuide.rule4"),
            t("typographyGuide.rule5"),
            t("typographyGuide.rule6"),
            t("typographyGuide.rule7"),
            t("typographyGuide.rule8")
          ].map((rule, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: C.gold, flexShrink: 0 }}>&#10022;</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
