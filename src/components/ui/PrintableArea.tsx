import React, { forwardRef, ReactNode } from 'react';
import { Printer } from 'lucide-react';

interface PrintableAreaProps {
  children: ReactNode;
  documentTitle?: string;
  orientation?: 'portrait' | 'landscape' | 'auto';
  showPrintButton?: boolean;
  buttonText?: string;
  buttonClassName?: string;
  className?: string;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  pageSize?: 'A4' | 'A3';
}

/**
 * Composant pour encapsuler du contenu imprimable
 * Masque automatiquement les éléments non-imprimables lors de l'impression
 */
const PrintableArea = forwardRef<HTMLDivElement, PrintableAreaProps>(
  ({
    children,
    documentTitle = 'Document',
    orientation = 'auto',
    showPrintButton = true,
    buttonText = 'Aperçu avant impression',
    buttonClassName = '',
    className = '',
    headerContent,
    footerContent,
    pageSize = 'A4'
  }, ref) => {

    const handlePrint = () => {
      // Définir le titre du document pour l'impression
      const originalTitle = document.title;
      document.title = documentTitle;

      // Ajouter les classes d'impression au body
      document.body.classList.add('printing');

      // Définir l'orientation
      if (orientation !== 'auto') {
        document.body.classList.add(`print-${orientation}`);
      }

      // Définir la taille de page
      document.body.classList.add(`print-${pageSize.toLowerCase()}`);

      // Ouvrir la boîte de dialogue d'impression
      setTimeout(() => {
        window.print();

        // Nettoyer après impression
        setTimeout(() => {
          document.title = originalTitle;
          document.body.classList.remove('printing');
          document.body.classList.remove(`print-${orientation}`);
          document.body.classList.remove(`print-${pageSize.toLowerCase()}`);
        }, 500);
      }, 100);
    };

    return (
      <>
        {showPrintButton && (
          <div className="print-hide mb-4">
            <button
              onClick={handlePrint}
              className={
                buttonClassName ||
                'flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
              } aria-label="Imprimer">
              <Printer className="w-4 h-4" />
              <span>{buttonText}</span>
            </button>
          </div>
        )}

        <div
          ref={ref}
          className={`print-area ${className}`}
          data-print-orientation={orientation}
          data-print-size={pageSize}
        >
          {/* En-tête d'impression (visible uniquement à l'impression) */}
          {headerContent && (
            <div className="print-header hidden print:block">
              {headerContent}
            </div>
          )}

          {/* Contenu principal */}
          <div className="print-content">
            {children}
          </div>

          {/* Pied de page d'impression (visible uniquement à l'impression) */}
          {footerContent && (
            <div className="print-footer hidden print:block">
              {footerContent}
            </div>
          )}
        </div>
      </>
    );
  }
);

PrintableArea.displayName = 'PrintableArea';

export default PrintableArea;