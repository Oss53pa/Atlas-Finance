import { useState } from "react";

const C = {
  bg: "#0B1120", card: "#111827", cardAlt: "#1a2332", border: "#1e293b",
  accent: "#3b82f6", gold: "#d4a843", green: "#22c55e", orange: "#f59e0b",
  red: "#ef4444", cyan: "#06b6d4", purple: "#a78bfa",
  t1: "#f1f5f9", t2: "#94a3b8", t3: "#64748b",
};

const SCALES: Record<string, { label: string; note: string; base: number; levels: { role: string; rem: string; pt: number; px: number; weight: number; line: number; spacing: string; use: string }[] }> = {
  print: {
    label: "Document Imprimé (A4/Letter)",
    note: "Optimisé pour lecture papier à 30-40 cm",
    base: 16,
    levels: [
      { role: "Titre principal (H1)", rem: "2.25rem", pt: 27, px: 36, weight: 700, line: 1.2, spacing: "-0.02em", use: "Titre du document, couverture" },
      { role: "Titre section (H2)", rem: "1.75rem", pt: 21, px: 28, weight: 700, line: 1.25, spacing: "-0.01em", use: "Chapitres, grandes sections" },
      { role: "Sous-titre (H3)", rem: "1.375rem", pt: 16.5, px: 22, weight: 600, line: 1.3, spacing: "0", use: "Sous-sections" },
      { role: "Sous-sous-titre (H4)", rem: "1.125rem", pt: 13.5, px: 18, weight: 600, line: 1.35, spacing: "0", use: "Paragraphes titrés" },
      { role: "Corps de texte", rem: "1rem", pt: 12, px: 16, weight: 400, line: 1.6, spacing: "0", use: "Texte principal — RÉFÉRENCE" },
      { role: "Texte secondaire", rem: "0.875rem", pt: 10.5, px: 14, weight: 400, line: 1.5, spacing: "0", use: "Notes, légendes, en-têtes tableau" },
      { role: "Petit texte / Caption", rem: "0.75rem", pt: 9, px: 12, weight: 400, line: 1.4, spacing: "0.01em", use: "Pied de page, mentions légales" },
      { role: "Micro texte", rem: "0.625rem", pt: 7.5, px: 10, weight: 400, line: 1.3, spacing: "0.02em", use: "Numéros de page, filigrane" },
    ]
  },
  screen: {
    label: "Application Web / SaaS",
    note: "Optimisé pour écran à 50-70 cm",
    base: 16,
    levels: [
      { role: "Titre page (H1)", rem: "2rem", pt: 24, px: 32, weight: 700, line: 1.2, spacing: "-0.02em", use: "Titre de page principale" },
      { role: "Titre section (H2)", rem: "1.5rem", pt: 18, px: 24, weight: 600, line: 1.25, spacing: "-0.01em", use: "Sections de dashboard" },
      { role: "Sous-titre (H3)", rem: "1.25rem", pt: 15, px: 20, weight: 600, line: 1.3, spacing: "0", use: "Cartes, panneaux" },
      { role: "Label / H4", rem: "1rem", pt: 12, px: 16, weight: 600, line: 1.4, spacing: "0", use: "Étiquettes, titres de champs" },
      { role: "Corps de texte", rem: "0.9375rem", pt: 11.25, px: 15, weight: 400, line: 1.6, spacing: "0", use: "Texte principal — RÉFÉRENCE" },
      { role: "Texte tableau / UI", rem: "0.875rem", pt: 10.5, px: 14, weight: 400, line: 1.5, spacing: "0", use: "Cellules de tableau, inputs" },
      { role: "Badge / Caption", rem: "0.75rem", pt: 9, px: 12, weight: 500, line: 1.4, spacing: "0.01em", use: "Badges, tags, timestamps" },
      { role: "Micro UI", rem: "0.625rem", pt: 7.5, px: 10, weight: 500, line: 1.3, spacing: "0.05em", use: "Overline, labels très petits" },
    ]
  },
  report: {
    label: "Rapport Financier / Cahier des charges",
    note: "Standard corporate — lisible imprimé ET écran",
    base: 16,
    levels: [
      { role: "Titre du document", rem: "2.5rem", pt: 30, px: 40, weight: 700, line: 1.15, spacing: "-0.02em", use: "Page de garde uniquement" },
      { role: "Titre chapitre (H1)", rem: "1.875rem", pt: 22.5, px: 30, weight: 700, line: 1.2, spacing: "-0.01em", use: "CHAPITRE 1, PHASE 0, etc." },
      { role: "Titre section (H2)", rem: "1.5rem", pt: 18, px: 24, weight: 600, line: 1.25, spacing: "0", use: "1.1, 2.3, etc." },
      { role: "Sous-section (H3)", rem: "1.25rem", pt: 15, px: 20, weight: 600, line: 1.3, spacing: "0", use: "1.1.1, Correction 0.1" },
      { role: "Paragraphe titré (H4)", rem: "1.0625rem", pt: 12.75, px: 17, weight: 600, line: 1.35, spacing: "0", use: "Étape 1, Note, Attention" },
      { role: "Corps de texte", rem: "1rem", pt: 12, px: 16, weight: 400, line: 1.7, spacing: "0", use: "Texte principal — RÉFÉRENCE" },
      { role: "Code / Technique", rem: "0.875rem", pt: 10.5, px: 14, weight: 400, line: 1.5, spacing: "0", use: "Blocs de code, chemins fichiers" },
      { role: "Note de bas de page", rem: "0.75rem", pt: 9, px: 12, weight: 400, line: 1.4, spacing: "0", use: "Références, disclaimers" },
    ]
  }
};

const FONTS = [
  { name: "Inter", type: "Sans-serif", best: "Web/SaaS", note: "Google Fonts — le standard moderne" },
  { name: "Source Sans 3", type: "Sans-serif", best: "Rapports", note: "Adobe — excellent pour documents longs" },
  { name: "Quicksand", type: "Sans-serif", best: "UI moderne", note: "Ta police actuelle — arrondie, friendly" },
  { name: "Garamond", type: "Serif", best: "Rapports formels", note: "Classique corporate — très lisible imprimé" },
  { name: "Merriweather", type: "Serif", best: "Documents longs", note: "Google Fonts — optimisé écran + print" },
  { name: "Fira Code", type: "Monospace", best: "Code", note: "Ligatures — pour blocs de code" },
  { name: "JetBrains Mono", type: "Monospace", best: "Code", note: "Très lisible — Atlas Finance code blocs" },
  { name: "Sometype Mono", type: "Monospace", best: "UI tech", note: "Ta police Atlas FM — unique" },
];

const RATIOS = [
  { name: "Minor Third", ratio: 1.2, vibe: "Compact, dense", best: "Apps/dashboards" },
  { name: "Major Third", ratio: 1.25, vibe: "Équilibré ★", best: "Documents professionnels — recommandé" },
  { name: "Perfect Fourth", ratio: 1.333, vibe: "Aéré, clair", best: "Rapports, présentations" },
  { name: "Golden Ratio", ratio: 1.618, vibe: "Dramatique", best: "Pages de garde, titres marketing" },
];

export default function TypographyGuide() {
  const [activeScale, setActiveScale] = useState("print");
  const [showFonts, setShowFonts] = useState(false);
  const [showRatios, setShowRatios] = useState(false);

  const scale = SCALES[activeScale];

  return (
    <div style={{ background: C.bg, color: C.t1, minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px", color: C.t1 }}>Guide Typographique</h1>
        <p style={{ fontSize: 14, color: C.t2, margin: 0 }}>Tailles de police pour documents professionnels — rem, pt, px</p>
      </div>

      {/* Sélecteur de contexte */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {Object.entries(SCALES).map(([key, s]) => (
          <button key={key} onClick={() => setActiveScale(key)} style={{
            padding: "10px 18px", borderRadius: 8, border: `1px solid ${activeScale === key ? C.accent : C.border}`,
            background: activeScale === key ? C.accent + "20" : C.card, color: activeScale === key ? C.accent : C.t2,
            cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s"
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Info contexte */}
      <div style={{ background: C.card, borderRadius: 12, padding: 16, marginBottom: 24, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, color: C.t2 }}>{scale.note}</div>
        <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>
          Base : 1rem = {scale.base}px = {scale.base * 0.75}pt &nbsp;|&nbsp;
          Formules : <span style={{ color: C.gold }}>pt = px × 0.75</span> &nbsp;|&nbsp;
          <span style={{ color: C.cyan }}>rem = px ÷ {scale.base}</span>
        </div>
      </div>

      {/* Table principale */}
      <div style={{ background: C.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.cardAlt }}>
              {["Rôle", "rem", "pt", "px", "Graisse", "Interligne", "Espacement", "Utilisation"].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: C.t2, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scale.levels.map((l, i) => {
              const isBase = l.role.includes("Corps") || l.role.includes("RÉFÉRENCE");
              return (
                <tr key={i} style={{ background: isBase ? C.accent + "10" : "transparent", borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 14px", fontWeight: isBase ? 700 : 500, color: isBase ? C.accent : C.t1 }}>
                    {isBase && <span style={{ color: C.gold, marginRight: 6 }}>&#9733;</span>}
                    {l.role}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: C.cyan, fontWeight: 600 }}>{l.rem}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: C.gold, fontWeight: 600 }}>{l.pt}pt</td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: C.green }}>{l.px}px</td>
                  <td style={{ padding: "10px 14px", color: C.t2 }}>{l.weight}</td>
                  <td style={{ padding: "10px 14px", color: C.t2 }}>{l.line}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: C.t3, fontSize: 11 }}>{l.spacing}</td>
                  <td style={{ padding: "10px 14px", color: C.t3, fontSize: 12 }}>{l.use}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Prévisualisation */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 40, marginBottom: 24, color: "#1a1a1a" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <p style={{ fontSize: 10, color: "#999", marginBottom: 24, textTransform: "uppercase", letterSpacing: "0.1em" }}>Prévisualisation — {scale.label}</p>
          {scale.levels.map((l, i) => (
            <div key={i} style={{ marginBottom: i < scale.levels.length - 1 ? 16 : 0 }}>
              <p style={{
                fontSize: l.px, fontWeight: l.weight, lineHeight: l.line,
                letterSpacing: l.spacing, margin: 0, color: i >= 5 ? "#666" : "#1a1a1a",
                fontFamily: l.role.includes("Code") ? "'Fira Code', monospace" : "'Inter', system-ui, sans-serif"
              }}>
                {l.role} — {l.pt}pt / {l.px}px
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
          <span>Polices recommandées par contexte</span>
          <span style={{ transform: showFonts ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>&#9660;</span>
        </button>
        {showFonts && (
          <div style={{ background: C.card, borderRadius: "0 0 12px 12px", border: `1px solid ${C.border}`, borderTop: "none", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.cardAlt }}>
                  {["Police", "Type", "Meilleur pour", "Notes"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.t2, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FONTS.map((f, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: C.accent }}>{f.name}</td>
                    <td style={{ padding: "10px 14px", color: C.t2 }}>{f.type}</td>
                    <td style={{ padding: "10px 14px", color: C.gold }}>{f.best}</td>
                    <td style={{ padding: "10px 14px", color: C.t3, fontSize: 12 }}>{f.note}</td>
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
          <span>Échelles typographiques (ratios)</span>
          <span style={{ transform: showRatios ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>&#9660;</span>
        </button>
        {showRatios && (
          <div style={{ background: C.card, borderRadius: "0 0 12px 12px", border: `1px solid ${C.border}`, borderTop: "none", padding: 20 }}>
            {RATIOS.map((r, i) => (
              <div key={i} style={{ marginBottom: 16, padding: 16, background: C.cardAlt, borderRadius: 8, border: r.name.includes("★") ? `1px solid ${C.gold}` : `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: r.name.includes("★") ? C.gold : C.t1 }}>{r.name}</span>
                  <span style={{ fontFamily: "monospace", color: C.cyan }}>× {r.ratio}</span>
                </div>
                <div style={{ fontSize: 12, color: C.t3, marginBottom: 8 }}>{r.vibe} — {r.best}</div>
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
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: C.t1 }}>Formules de conversion</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
          {[
            { label: "px → pt", formula: "pt = px × 0.75", example: "16px = 12pt", color: C.gold },
            { label: "pt → px", formula: "px = pt ÷ 0.75", example: "12pt = 16px", color: C.green },
            { label: "px → rem", formula: "rem = px ÷ base", example: "24px = 1.5rem (base 16)", color: C.cyan },
            { label: "rem → px", formula: "px = rem × base", example: "1.5rem = 24px (base 16)", color: C.accent },
            { label: "pt → rem", formula: "rem = pt ÷ (base × 0.75)", example: "18pt = 1.5rem", color: C.purple },
            { label: "Interligne", formula: "line-height = 1.5 à 1.7 × taille", example: "12pt → 18-20pt interligne", color: C.orange },
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
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.gold, marginBottom: 12 }}>Règles d'or typographiques</h3>
        <div style={{ display: "grid", gap: 8, fontSize: 13, color: C.t2 }}>
          {[
            "Le corps de texte ne descend JAMAIS en dessous de 11pt (14.67px) pour l'imprimé ou 14px pour l'écran",
            "Maximum 2 polices par document : 1 sans-serif + 1 serif OU 1 sans-serif + 1 monospace",
            "L'interligne du corps de texte est entre 1.5× et 1.7× la taille de police (meilleure lisibilité)",
            "La largeur de ligne idéale est de 60 à 75 caractères (trop large = fatigue oculaire)",
            "Les titres ont une interligne plus serrée (1.1× à 1.3×) que le corps de texte",
            "Le ratio entre niveaux de titres est constant : choisir 1.25× (Major Third) pour les docs pro",
            "Les graisses utiles : 400 (normal), 600 (semi-bold), 700 (bold) — éviter 300 et 900",
            "Espacement négatif (letter-spacing) sur les gros titres, positif sur les petits textes / majuscules"
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
