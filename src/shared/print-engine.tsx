// ============================================================
// @atlas-studio/print-engine — Fichier unique, zéro dépendance externe
// Copier ce fichier dans src/shared/ de chaque app Atlas Studio
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react'

// ── TYPES ────────────────────────────────────────────────────

export type PrintFormat = 'A3' | 'A4' | 'A5'
export type PrintOrientation = 'portrait' | 'landscape'

export interface PrintConfig {
  /** Format papier — défaut : A4 */
  format?: PrintFormat
  /** Orientation — défaut : portrait */
  orientation?: PrintOrientation
  /** Titre principal du document */
  title?: string
  /** Sous-titre / période / référence */
  subtitle?: string
  /** Nom de l'application (ex: "WiseFM") */
  appName?: string
  /** Afficher le logo Atlas Studio */
  showLogo?: boolean
  /** Afficher la numérotation des pages */
  showPageNumbers?: boolean
  /** Afficher la date d'impression */
  showDate?: boolean
  /** Override marges en mm — optionnel */
  margins?: { top?: number; right?: number; bottom?: number; left?: number }
  /** Callback avant impression */
  onBeforePrint?: () => void
  /** Callback après impression */
  onAfterPrint?: () => void
}

interface ResolvedConfig {
  format: PrintFormat
  orientation: PrintOrientation
  dims: { wMM: number; hMM: number; wPX: number; hPX: number }
  margins: { top: number; right: number; bottom: number; left: number }
  title: string
  subtitle: string
  appName: string
  showLogo: boolean
  showPageNumbers: boolean
  showDate: boolean
}

// ── FORMAT RESOLVER ──────────────────────────────────────────

const FORMAT_DATA: Record<PrintFormat, Record<PrintOrientation, { wMM: number; hMM: number; wPX: number; hPX: number }>> = {
  A3: {
    portrait:  { wMM: 297, hMM: 420, wPX: 1123, hPX: 1587 },
    landscape: { wMM: 420, hMM: 297, wPX: 1587, hPX: 1123 },
  },
  A4: {
    portrait:  { wMM: 210, hMM: 297, wPX: 794,  hPX: 1123 },
    landscape: { wMM: 297, hMM: 210, wPX: 1123, hPX: 794  },
  },
  A5: {
    portrait:  { wMM: 148, hMM: 210, wPX: 559,  hPX: 794  },
    landscape: { wMM: 210, hMM: 148, wPX: 794,  hPX: 559  },
  },
}

const DEFAULT_MARGINS: Record<PrintFormat, { top: number; right: number; bottom: number; left: number }> = {
  A3: { top: 20, right: 18, bottom: 20, left: 18 },
  A4: { top: 15, right: 12, bottom: 15, left: 12 },
  A5: { top: 10, right: 8,  bottom: 10, left: 8  },
}

function resolveConfig(config: PrintConfig): ResolvedConfig {
  const format: PrintFormat           = config.format      ?? 'A4'
  const orientation: PrintOrientation = config.orientation ?? 'portrait'
  const base = DEFAULT_MARGINS[format]
  return {
    format,
    orientation,
    dims: FORMAT_DATA[format][orientation],
    margins: {
      top:    config.margins?.top    ?? base.top,
      right:  config.margins?.right  ?? base.right,
      bottom: config.margins?.bottom ?? base.bottom,
      left:   config.margins?.left   ?? base.left,
    },
    title:           config.title           ?? '',
    subtitle:        config.subtitle        ?? '',
    appName:         config.appName         ?? 'Atlas Studio',
    showLogo:        config.showLogo        ?? true,
    showPageNumbers: config.showPageNumbers ?? true,
    showDate:        config.showDate        ?? true,
  }
}

// ── STYLE INJECTOR ───────────────────────────────────────────

const STYLE_ID = 'atlas-print-engine-css'

function buildPrintCSS(rc: ResolvedConfig): string {
  const { dims, margins, format } = rc
  const fontSize = format === 'A5' ? '9pt' : format === 'A3' ? '12pt' : '10pt'

  return `
    @page {
      size: ${dims.wMM}mm ${dims.hMM}mm;
      margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
    }
    @media print {
      body > *:not(#atlas-print-root) { display: none !important; visibility: hidden !important; }
      nav, aside, header:not(.atlas-print-header),
      footer:not(.atlas-print-footer),
      .sidebar, .topbar, .bottom-bar, .fab,
      .app-shell, .app-layout, .app-nav,
      [data-sidebar], [data-navbar], [data-toolbar],
      [data-no-print], [data-print="false"], .no-print,
      button:not(.atlas-print-btn), .btn, .badge-ui, .chip,
      [role="navigation"], [role="banner"], [role="complementary"],
      .tooltip, .popover, .dropdown-menu,
      .notification, .toast, .snackbar,
      .filter-bar, .search-bar, .action-bar, .toolbar { display: none !important; }

      #atlas-print-root {
        display: block !important;
        visibility: visible !important;
        position: static !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
      }
      * { box-sizing: border-box !important; max-width: 100% !important; }
      body, #atlas-print-root {
        font-size: ${fontSize} !important;
        line-height: 1.45 !important;
        color: #000 !important;
        background: #fff !important;
      }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; word-break: break-word !important; }
      thead { display: table-header-group !important; }
      tfoot { display: table-footer-group !important; }
      tr { page-break-inside: avoid !important; break-inside: avoid !important; }
      td, th { overflow: hidden !important; text-overflow: ellipsis !important; }
      .atlas-print-block, figure { page-break-inside: avoid !important; break-inside: avoid !important; }
      h1, h2, h3, h4, h5, h6 { page-break-after: avoid !important; break-after: avoid !important; }
      a { text-decoration: none !important; color: inherit !important; }
      a[href]:after { content: none !important; }
      img, svg { max-width: 100% !important; height: auto !important; page-break-inside: avoid !important; }
      .atlas-page-break { page-break-after: always !important; break-after: always !important; }
      .atlas-no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
    }
  `
}

function injectCSS(rc: ResolvedConfig): void {
  document.getElementById(STYLE_ID)?.remove()
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.innerHTML = buildPrintCSS(rc)
  document.head.appendChild(el)
}

function removeCSS(): void {
  document.getElementById(STYLE_ID)?.remove()
}

// ── PRINT HEADER ─────────────────────────────────────────────

function PrintHeader({ rc }: { rc: ResolvedConfig }) {
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  return (
    <div className="atlas-print-header" style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      borderBottom: '1.5px solid #111', paddingBottom: 10, marginBottom: 18,
    }}>
      <div>
        {rc.showLogo && (
          <div style={{ fontSize: 14, fontWeight: 800, color: '#B8954A', letterSpacing: 1 }}>
            ATLAS<span style={{ fontWeight: 300, color: '#000' }}>S</span>
          </div>
        )}
        <div style={{ fontSize: 7, letterSpacing: 2, textTransform: 'uppercase', color: '#888', fontWeight: 600, marginTop: 1 }}>
          {rc.appName}
        </div>
      </div>
      <div style={{ textAlign: 'center', flex: 1, padding: '0 16px' }}>
        {rc.title && <div style={{ fontSize: 11, fontWeight: 700, color: '#000' }}>{rc.title}</div>}
        {rc.subtitle && <div style={{ fontSize: 8, color: '#555', marginTop: 2 }}>{rc.subtitle}</div>}
      </div>
      <div style={{ textAlign: 'right', minWidth: 80 }}>
        {rc.showDate && <div style={{ fontSize: 7, color: '#666' }}>{date}</div>}
        <div style={{ fontSize: 7, color: '#B8954A', fontWeight: 700, letterSpacing: 1, marginTop: 1 }}>CONFIDENTIEL</div>
      </div>
    </div>
  )
}

// ── PRINT FOOTER ─────────────────────────────────────────────

function PrintFooter({ rc }: { rc: ResolvedConfig }) {
  const orientLabel = rc.orientation === 'portrait' ? 'Portrait' : 'Paysage'
  return (
    <div className="atlas-print-footer" style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderTop: '0.5px solid #ccc', paddingTop: 6, marginTop: 16,
      fontSize: 7, color: '#888',
    }}>
      <span>Atlas Studio © {new Date().getFullYear()} — {rc.appName}</span>
      {rc.showPageNumbers && (
        <span>Page <span className="atlas-page-number" /> / <span className="atlas-page-count" /></span>
      )}
      <span style={{ opacity: 0.6 }}>{rc.format} {orientLabel}</span>
    </div>
  )
}

// ── PRINT WRAPPER ─────────────────────────────────────────────

export function PrintWrapper({ children, config }: { children: React.ReactNode; config: PrintConfig }) {
  const rc = resolveConfig(config)
  return (
    <div id="atlas-print-root" style={{ width: '100%', background: 'white', color: 'black' }}>
      <PrintHeader rc={rc} />
      <div className="atlas-print-content">{children}</div>
      <PrintFooter rc={rc} />
    </div>
  )
}

// ── PREVIEW MODAL ─────────────────────────────────────────────

const MODAL_CSS = `
.apm-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:99999;display:flex;flex-direction:column;align-items:center}
.apm-topbar{width:100%;height:54px;background:#111;border-bottom:1px solid #222;display:flex;align-items:center;padding:0 20px;gap:14px;flex-shrink:0}
.apm-brand{font-size:10px;font-weight:700;color:#B8954A;letter-spacing:2.5px;text-transform:uppercase;white-space:nowrap;flex-shrink:0}
.apm-controls{display:flex;align-items:center;gap:8px;flex:1;justify-content:center;flex-wrap:wrap}
.apm-select{background:#1e1e1e;border:1px solid #333;color:#fff;font-size:11px;padding:5px 8px;border-radius:5px;cursor:pointer;outline:none}
.apm-select:hover{border-color:#B8954A}
.apm-tgrp{display:flex;background:#1e1e1e;border:1px solid #333;border-radius:5px;overflow:hidden}
.apm-tbtn{background:transparent;border:none;color:#777;padding:5px 11px;cursor:pointer;font-size:10px;transition:all .15s;white-space:nowrap}
.apm-tbtn:hover{background:#2a2a2a;color:#fff}
.apm-tbtn.apm-on{background:#B8954A;color:#000;font-weight:700}
.apm-zgrp{display:flex;align-items:center;gap:4px}
.apm-zbtn{background:#1e1e1e;border:1px solid #333;color:#ccc;width:24px;height:24px;border-radius:4px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;line-height:1;transition:all .15s}
.apm-zbtn:hover{border-color:#B8954A;color:#B8954A}
.apm-zlbl{font-size:10px;color:#888;min-width:32px;text-align:center}
.apm-diminfo{font-size:9px;color:#555;white-space:nowrap}
.apm-actions{display:flex;gap:6px;flex-shrink:0}
.apm-btnprint{background:#B8954A;border:none;color:#000;font-size:11px;font-weight:700;padding:7px 16px;border-radius:5px;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background .15s}
.apm-btnprint:hover{background:#f5b548}
.apm-btnclose{background:transparent;border:1px solid #333;color:#888;width:30px;height:30px;border-radius:5px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.apm-btnclose:hover{border-color:#e04040;color:#e04040}
.apm-canvas{flex:1;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:28px 20px;width:100%}
.apm-page{background:white;box-shadow:0 8px 40px rgba(0,0,0,0.6);flex-shrink:0;overflow:hidden;transition:width .2s,height .2s}
.apm-inner{transform-origin:top left;font-family:system-ui,sans-serif;color:#000;background:#fff}
.apm-footerbar{height:26px;background:#0a0a0a;border-top:1px solid #1e1e1e;display:flex;align-items:center;justify-content:center;font-size:8px;letter-spacing:1.5px;color:#333;flex-shrink:0;width:100%}
`

interface PreviewProps {
  isOpen: boolean
  onClose: () => void
  onPrint: (rc: ResolvedConfig) => void
  children: React.ReactNode
  config: PrintConfig
}

function PrintPreviewModal({ isOpen, onClose, onPrint, children, config }: PreviewProps) {
  const [format, setFormat]           = useState<PrintFormat>(config.format ?? 'A4')
  const [orientation, setOrientation] = useState<PrintOrientation>(config.orientation ?? 'portrait')
  const [zoom, setZoom]               = useState(80)

  useEffect(() => {
    if (!document.getElementById('apm-styles')) {
      const s = document.createElement('style')
      s.id = 'apm-styles'
      s.innerHTML = MODAL_CSS
      document.head.appendChild(s)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const rc = resolveConfig({ ...config, format, orientation })
  const { dims, margins } = rc
  const scale = zoom / 100
  const PX_PER_MM = 3.7795275591

  const handlePrint = () => {
    onClose()
    setTimeout(() => onPrint(rc), 150)
  }

  return (
    <div className="apm-backdrop">
      <div className="apm-topbar">
        <div className="apm-brand">Aperçu impression</div>
        <div className="apm-controls">
          <select className="apm-select" value={format} onChange={e => setFormat(e.target.value as PrintFormat)}>
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="A5">A5</option>
          </select>
          <div className="apm-tgrp">
            <button className={`apm-tbtn ${orientation === 'portrait' ? 'apm-on' : ''}`} onClick={() => setOrientation('portrait')}>Portrait</button>
            <button className={`apm-tbtn ${orientation === 'landscape' ? 'apm-on' : ''}`} onClick={() => setOrientation('landscape')}>Paysage</button>
          </div>
          <div className="apm-zgrp">
            <button className="apm-zbtn" onClick={() => setZoom(z => Math.max(25, z - 10))}>−</button>
            <span className="apm-zlbl">{zoom}%</span>
            <button className="apm-zbtn" onClick={() => setZoom(z => Math.min(150, z + 10))}>+</button>
          </div>
          <span className="apm-diminfo">{dims.wMM} × {dims.hMM} mm</span>
        </div>
        <div className="apm-actions">
          <button className="apm-btnprint" onClick={handlePrint}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimer
          </button>
          <button className="apm-btnclose" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="apm-canvas">
        <div className="apm-page" style={{ width: Math.round(dims.wPX * scale), height: Math.round(dims.hPX * scale) }}>
          <div className="apm-inner" style={{
            width: dims.wPX,
            height: dims.hPX,
            transform: `scale(${scale})`,
            padding: `${Math.round(margins.top * PX_PER_MM)}px ${Math.round(margins.right * PX_PER_MM)}px ${Math.round(margins.bottom * PX_PER_MM)}px ${Math.round(margins.left * PX_PER_MM)}px`,
          }}>
            <PrintHeader rc={rc} />
            <div>{children}</div>
            <PrintFooter rc={rc} />
          </div>
        </div>
      </div>

      <div className="apm-footerbar">ATLAS STUDIO · PRINT ENGINE · ÉCHAP POUR FERMER</div>
    </div>
  )
}

// ── usePrint HOOK ─────────────────────────────────────────────

export function usePrint(config: PrintConfig = {}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const openPreview  = useCallback(() => setIsPreviewOpen(true),  [])
  const closePreview = useCallback(() => setIsPreviewOpen(false), [])

  const executePrint = useCallback((rc: ResolvedConfig) => {
    config.onBeforePrint?.()
    injectCSS(rc)
    window.print()
    window.addEventListener('afterprint', () => {
      removeCSS()
      config.onAfterPrint?.()
    }, { once: true })
  }, [config])

  const printDirect = useCallback(() => {
    executePrint(resolveConfig(config))
  }, [config, executePrint])

  return { openPreview, closePreview, isPreviewOpen, executePrint, printDirect }
}

// ── PrintButton — COMPOSANT CLÉ EN MAIN ──────────────────────
// Usage : <PrintButton config={{ title: '...', appName: 'WiseFM' }}><MonContenu /></PrintButton>

interface PrintButtonProps {
  config?: PrintConfig
  children: React.ReactNode
  label?: string
  className?: string
  style?: React.CSSProperties
}

export function PrintButton({ config = {}, children, label, className, style }: PrintButtonProps) {
  const { openPreview, closePreview, isPreviewOpen, executePrint } = usePrint(config)

  const defaultStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '7px 15px',
    background: 'transparent',
    border: '1px solid #d0d0d0',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: 'inherit',
    transition: 'border-color .15s',
  }

  return (
    <>
      <button
        onClick={openPreview}
        className={className}
        style={style ?? defaultStyle}
        data-no-print="true"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
        </svg>
        {label ?? 'Aperçu / Imprimer'}
      </button>

      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        onPrint={executePrint}
        config={config}
      >
        {children}
      </PrintPreviewModal>
    </>
  )
}

// ── CLASSES UTILITAIRES ───────────────────────────────────────
// Dans le contenu imprimable :
// <div className="atlas-page-break" />          → saut de page forcé
// <div className="atlas-no-break">...</div>     → bloc jamais coupé
// <div className="atlas-print-block">...</div>  → bloc évite coupure
