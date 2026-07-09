/**
 * BudgetImportModal — Import d'un budget Excel/CSV (action, pas un module).
 * Lancé depuis le Cockpit / les versions. Fin wrapper Dialog autour de
 * BudgetImportPanel (la logique d'import est mutualisée avec le sous-module
 * « Table & Import » du module Budget).
 */
import React from 'react';
import { Dialog, DialogContent } from '../../components/ui/Dialog';
import BudgetImportPanel from './BudgetImportPanel';

interface Props { open: boolean; onClose: () => void; onImported?: () => void; initialVersionId?: string }

const BudgetImportModal: React.FC<Props> = ({ open, onClose, onImported, initialVersionId }) => (
  <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }} containerClassName="max-w-3xl">
    <DialogContent>
      {open && (
        <BudgetImportPanel initialVersionId={initialVersionId} onImported={onImported} onClose={onClose} />
      )}
    </DialogContent>
  </Dialog>
);

export default BudgetImportModal;
