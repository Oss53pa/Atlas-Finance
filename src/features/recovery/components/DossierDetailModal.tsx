import React from 'react';
import { DossierRecouvrement } from '../types/recovery.types';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';
import { Badge } from '@/shared/components/ui/Badge';
import {
  Calendar,
  User,
  Mail,
  Phone,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface DossierDetailModalProps {
  dossier: DossierRecouvrement;
}

const getStatusBadge = (statut: string) => {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    actif: 'success',
    suspendu: 'warning',
    cloture: 'neutral',
    juridique: 'error',
  };

  const labels: Record<string, string> = {
    actif: 'Actif',
    suspendu: 'Suspendu',
    cloture: 'Clôturé',
    juridique: 'Juridique',
  };

  return (
    <Badge variant={variants[statut] || 'neutral'}>
      {labels[statut] || statut}
    </Badge>
  );
};

const getRiskBadge = (niveau: string) => {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    faible: 'success',
    moyen: 'warning',
    eleve: 'error',
    critique: 'error',
  };

  const labels: Record<string, string> = {
    faible: 'Faible',
    moyen: 'Moyen',
    eleve: 'Élevé',
    critique: 'Critique',
  };

  return (
    <Badge variant={variants[niveau] || 'neutral'}>
      {labels[niveau] || niveau}
    </Badge>
  );
};

export const DossierDetailModal: React.FC<DossierDetailModalProps> = ({ dossier }) => {
  const montantRestant = dossier.montantTotal - dossier.montantPaye;
  const tauxRecouvrement = (dossier.montantPaye / dossier.montantTotal) * 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#191919] border-b border-[#D9D9D9] pb-2">
            Informations Générales
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-[#767676] mt-1" />
              <div>
                <p className="text-sm text-[#767676]">Référence</p>
                <p className="font-medium text-[#191919]">{dossier.numeroRef}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-[#767676] mt-1" />
              <div>
                <p className="text-sm text-[#767676]">Client</p>
                <p className="font-medium text-[#191919]">{dossier.client}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-[#767676] mt-1" />
              <div>
                <p className="text-sm text-[#767676]">Date d'Ouverture</p>
                <p className="font-medium text-[#191919]">
                  {formatDate(dossier.dateOuverture, 'long')}
                </p>
              </div>
            </div>

            {dossier.dateDerniereRelance && (
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-[#767676] mt-1" />
                <div>
                  <p className="text-sm text-[#767676]">Dernière Relance</p>
                  <p className="font-medium text-[#191919]">
                    {formatDate(dossier.dateDerniereRelance, 'long')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-[#767676] mt-1" />
              <div>
                <p className="text-sm text-[#767676]">Responsable</p>
                <p className="font-medium text-[#191919]">{dossier.responsable}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#191919] border-b border-[#D9D9D9] pb-2">
            Informations Financières
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-[#767676] mt-1" />
              <div className="flex-1">
                <p className="text-sm text-[#767676]">Montant Total</p>
                <p className="text-xl font-bold text-[#191919]">
                  {formatCurrency(dossier.montantTotal)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-[#6A8A82] mt-1" />
              <div className="flex-1">
                <p className="text-sm text-[#767676]">Montant Payé</p>
                <p className="text-lg font-semibold text-[#6A8A82]">
                  {formatCurrency(dossier.montantPaye)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#B85450] mt-1" />
              <div className="flex-1">
                <p className="text-sm text-[#767676]">Montant Restant</p>
                <p className="text-lg font-semibold text-[#B85450]">
                  {formatCurrency(montantRestant)}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#D9D9D9]">
              <p className="text-sm text-[#767676] mb-1">Taux de Recouvrement</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#F5F5F5] rounded-full h-2">
                  <div
                    className="bg-[#6A8A82] h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(tauxRecouvrement, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-[#191919]">
                  {tauxRecouvrement.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#D9D9D9]">
        <div>
          <p className="text-sm text-[#767676] mb-1">Statut</p>
          {getStatusBadge(dossier.statut)}
        </div>

        <div>
          <p className="text-sm text-[#767676] mb-1">Niveau de Risque</p>
          {getRiskBadge(dossier.niveauRisque)}
        </div>

        <div>
          <p className="text-sm text-[#767676] mb-1">Nombre de Factures</p>
          <p className="font-medium text-[#191919]">{dossier.nombreFactures}</p>
        </div>
      </div>

      {dossier.notes && (
        <div className="pt-4 border-t border-[#D9D9D9]">
          <h3 className="text-sm font-semibold text-[#191919] mb-2">Notes</h3>
          <p className="text-sm text-[#767676] whitespace-pre-wrap">{dossier.notes}</p>
        </div>
      )}
    </div>
  );
};