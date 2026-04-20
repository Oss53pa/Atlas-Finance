/**
 * Block Renderers — Barrel export + dispatcher
 * All block types from CDC V1 §8 + V2 §B.5, §C.2
 */
import React from 'react';
import type { ReportBlock } from '../../types';
import BlockWrapper from './BlockWrapper';
import TextBlockRenderer from './TextBlockRenderer';
import KPIBlockRenderer from './KPIBlockRenderer';
import KPIGridBlockRenderer from './KPIGridBlockRenderer';
import TableBlockRenderer from './TableBlockRenderer';
import ChartBlockRenderer from './ChartBlockRenderer';
import {
  SeparatorBlockRenderer,
  PageBreakBlockRenderer,
  SpacerBlockRenderer,
  CoverBlockRenderer,
} from './LayoutBlockRenderers';
import {
  ImageBlockRenderer,
  BackPageBlockRenderer,
  CommentBlockRenderer,
  CalloutBlockRenderer,
  ManualTableBlockRenderer,
  FormulaBlockRenderer,
  TOCBlockRenderer,
} from './MissingBlockRenderers';
import SommaireBlockRenderer from './SommaireBlock';
import PROPHETAnalysisBlockRenderer from './PROPHETAnalysisBlock';
import AnomalyDetectionBlockRenderer from './AnomalyDetectionBlock';
import ExecutiveSummaryBlockRenderer from './ExecutiveSummaryBlock';

export function renderBlock(block: ReportBlock): React.ReactNode {
  const inner = (() => {
    switch (block.type) {
      case 'text':
        return <TextBlockRenderer block={block} />;
      case 'kpi':
        return <KPIBlockRenderer block={block} />;
      case 'kpi-grid':
        return <KPIGridBlockRenderer block={block} />;
      case 'table':
        return <TableBlockRenderer block={block} />;
      case 'chart':
        return <ChartBlockRenderer block={block} />;
      case 'separator':
        return <SeparatorBlockRenderer block={block} />;
      case 'page-break':
        return <PageBreakBlockRenderer block={block} />;
      case 'spacer':
        return <SpacerBlockRenderer block={block} />;
      case 'cover':
        return <CoverBlockRenderer block={block} />;
      case 'image':
        return <ImageBlockRenderer block={block} />;
      case 'back-page':
        return <BackPageBlockRenderer block={block} />;
      case 'comment':
        return <CommentBlockRenderer block={block} />;
      case 'callout':
        return <CalloutBlockRenderer block={block} />;
      case 'manual-table':
        return <ManualTableBlockRenderer block={block} />;
      case 'formula':
        return <FormulaBlockRenderer block={block} />;
      case 'toc-block':
        return <TOCBlockRenderer block={block} />;
      case 'sommaire':
        return <SommaireBlockRenderer block={block} />;
      case 'prophet_analysis':
        return <PROPHETAnalysisBlockRenderer block={block} />;
      case 'anomaly_detection':
        return <AnomalyDetectionBlockRenderer block={block} />;
      case 'executive_summary':
        return <ExecutiveSummaryBlockRenderer block={block} />;
      case 'columns':
        // Columns render children side by side
        return (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${block.columnCount}, 1fr)` }}>
            {block.children.map((col, ci) => (
              <div key={ci} className="space-y-2">
                {col.map(childBlock => renderBlock(childBlock))}
                {col.length === 0 && (
                  <div className="border-2 border-dashed border-neutral-300 rounded-lg p-4 text-center text-[10px] text-neutral-400">
                    Colonne {ci + 1}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      default:
        return (
          <div className="p-4 bg-neutral-100 rounded text-xs text-neutral-500 text-center">
            Bloc non supporté : {(block as ReportBlock).type}
          </div>
        );
    }
  })();

  return (
    <BlockWrapper key={block.id} block={block}>
      {inner}
    </BlockWrapper>
  );
}

export { default as BlockWrapper } from './BlockWrapper';
export { default as TextBlockRenderer } from './TextBlockRenderer';
export { default as KPIBlockRenderer } from './KPIBlockRenderer';
export { default as TableBlockRenderer } from './TableBlockRenderer';
export { default as ChartBlockRenderer } from './ChartBlockRenderer';
