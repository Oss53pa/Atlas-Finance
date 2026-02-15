import React, { useRef, useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';

export interface PrintOptions {
  title?: string;
  orientation?: 'portrait' | 'landscape' | 'auto';
  pageSize?: 'A4' | 'A3';
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  scale?: number;
  showHeaders?: boolean;
  showFooters?: boolean;
  headerText?: string;
  footerText?: string;
  beforePrint?: () => void;
  afterPrint?: () => void;
  onError?: (error: Error) => void;
}

export interface PrintReturn {
  printRef: React.RefObject<HTMLDivElement>;
  handlePrint: () => void;
  isPrinting: boolean;
  PrintWrapper: React.FC<{ children: React.ReactNode }>;
}

/**
 * Hook pour gérer l'impression de contenu
 * @param options Options d'impression
 * @returns Objet avec ref, fonction d'impression et état
 */
export function usePrint(options: PrintOptions = {}): PrintReturn {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const {
    title = 'Document',
    orientation = 'auto',
    pageSize = 'A4',
    margins = { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    scale = 1,
    showHeaders = true,
    showFooters = true,
    headerText,
    footerText,
    beforePrint,
    afterPrint,
    onError
  } = options;

  /**
   * Détecter automatiquement l'orientation optimale
   */
  const detectOrientation = useCallback((): 'portrait' | 'landscape' => {
    if (orientation !== 'auto') return orientation;

    if (!printRef.current) return 'portrait';

    const element = printRef.current;
    const width = element.scrollWidth;
    const height = element.scrollHeight;

    // Si le contenu est plus large que haut, suggérer paysage
    // Particulièrement pour les tableaux larges
    const tables = element.querySelectorAll('table');
    if (tables.length > 0) {
      for (const table of tables) {
        if (table.scrollWidth > 700) {
          return 'landscape';
        }
      }
    }

    return width > height * 1.4 ? 'landscape' : 'portrait';
  }, [orientation]);

  /**
   * Préparer les styles d'impression
   */
  const prepareStyles = useCallback((): HTMLStyleElement => {
    const style = document.createElement('style');
    style.id = 'print-styles-temp';

    const detectedOrientation = detectOrientation();
    const marginString = `${margins.top} ${margins.right} ${margins.bottom} ${margins.left}`;

    style.innerHTML = `
      @media print {
        @page {
          size: ${pageSize} ${detectedOrientation};
          margin: ${marginString};
        }

        body {
          transform: scale(${scale});
          transform-origin: top left;
        }

        /* En-tête personnalisé */
        ${showHeaders && headerText ? `
        .print-custom-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 5mm;
          text-align: center;
          font-size: 10pt;
          border-bottom: 1pt solid #ddd;
        }
        .print-custom-header::after {
          content: "${headerText}";
        }
        ` : ''}

        /* Pied de page personnalisé */
        ${showFooters ? `
        .print-custom-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 5mm;
          text-align: center;
          font-size: 9pt;
          color: #666;
        }
        .print-custom-footer::after {
          content: "${footerText || `Page ${new Date().toLocaleDateString('fr-FR')}`}";
        }
        ` : ''}

        /* Ajustements pour tableaux larges */
        table {
          font-size: ${detectedOrientation === 'landscape' ? '9pt' : '10pt'};
        }

        /* Assurer que les images ne débordent pas */
        img {
          max-width: 100% !important;
          height: auto !important;
        }

        /* Éviter les coupures dans les éléments importants */
        .avoid-break,
        tr,
        blockquote,
        figure {
          page-break-inside: avoid;
        }
      }
    `;

    return style;
  }, [pageSize, margins, scale, showHeaders, showFooters, headerText, footerText, detectOrientation]);

  /**
   * Fonction d'impression principale
   */
  const handlePrint = useCallback(() => {
    try {
      setIsPrinting(true);

      // Sauvegarder le titre original
      const originalTitle = document.title;
      document.title = title;

      // Ajouter les styles temporaires
      const style = prepareStyles();
      document.head.appendChild(style);

      // Ajouter la classe d'impression au body
      document.body.classList.add('printing');

      // Callback avant impression
      if (beforePrint) {
        beforePrint();
      }

      // Ajouter les en-têtes/pieds de page si nécessaire
      let headerElement: HTMLDivElement | null = null;
      let footerElement: HTMLDivElement | null = null;

      if (showHeaders && headerText && printRef.current) {
        headerElement = document.createElement('div');
        headerElement.className = 'print-custom-header print-only';
        printRef.current.insertBefore(headerElement, printRef.current.firstChild);
      }

      if (showFooters && printRef.current) {
        footerElement = document.createElement('div');
        footerElement.className = 'print-custom-footer print-only';
        printRef.current.appendChild(footerElement);
      }

      // Délai pour s'assurer que les styles sont appliqués
      setTimeout(() => {
        window.print();

        // Nettoyer après l'impression
        setTimeout(() => {
          // Restaurer le titre
          document.title = originalTitle;

          // Retirer les styles temporaires
          if (style.parentNode) {
            style.parentNode.removeChild(style);
          }

          // Retirer la classe d'impression
          document.body.classList.remove('printing');

          // Retirer les éléments temporaires
          if (headerElement && headerElement.parentNode) {
            headerElement.parentNode.removeChild(headerElement);
          }
          if (footerElement && footerElement.parentNode) {
            footerElement.parentNode.removeChild(footerElement);
          }

          // Callback après impression
          if (afterPrint) {
            afterPrint();
          }

          setIsPrinting(false);
          toast.success('Impression terminée');
        }, 500);
      }, 100);

    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      setIsPrinting(false);

      if (onError) {
        onError(error as Error);
      } else {
        toast.error('Erreur lors de l\'impression');
      }
    }
  }, [title, prepareStyles, showHeaders, showFooters, headerText, beforePrint, afterPrint, onError]);

  /**
   * Composant wrapper pour faciliter l'utilisation
   */
  const PrintWrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement('div', {
      ref: printRef,
      className: 'print-area'
    }, children);
  };

  return {
    printRef,
    handlePrint,
    isPrinting,
    PrintWrapper
  };
}

/**
 * Hook pour imprimer un tableau avec pagination
 */
export function usePrintTable(options: PrintOptions & {
  rowsPerPage?: number;
} = {}) {
  const { rowsPerPage = 30, ...printOptions } = options;

  const print = usePrint({
    ...printOptions,
    orientation: options.orientation || 'landscape',
    beforePrint: () => {
      // Afficher toutes les lignes du tableau pour l'impression
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          (row as HTMLElement).style.display = '';
        });
      });

      if (options.beforePrint) {
        options.beforePrint();
      }
    }
  });

  return print;
}

/**
 * Hook pour imprimer des rapports financiers
 */
export function usePrintReport(options: PrintOptions = {}) {
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return usePrint({
    ...options,
    headerText: options.headerText || `${options.title || 'Rapport'} - Généré le ${today}`,
    footerText: options.footerText || `© ${new Date().getFullYear()} Atlas Finance - Page `,
    showHeaders: true,
    showFooters: true
  });
}

export default usePrint;