import React from 'react';
import { ArrowLeft, Edit, Download, Printer } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { ClientDetail } from '../types/client.types';

interface ClientHeaderProps {
  client: ClientDetail;
  onBack: () => void;
  onEdit: () => void;
  onExport: () => void;
  onPrint: () => void;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({
  client,
  onBack,
  onEdit,
  onExport,
  onPrint
}) => {
  const getStatutBadge = (statut: string) => {
    const styles = {
      ACTIF: 'bg-green-100 text-green-800',
      INACTIF: 'bg-gray-100 text-gray-800',
      PROSPECT: 'bg-blue-100 text-blue-800',
      SUSPENDU: 'bg-red-100 text-red-800'
    };
    return styles[statut as keyof typeof styles] || styles.ACTIF;
  };

  return (
    <div className="bg-white rounded-lg border border-[#D9D9D9] p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Button
            variant="outline"
            icon={ArrowLeft}
            onClick={onBack}
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#191919]">{client.nom}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatutBadge(client.statut)}`}>
                {client.statut}
              </span>
              {client.classification.clientStrategique && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  ⭐ Stratégique
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-[#767676]">
              <span>Code: {client.code}</span>
              <span>•</span>
              <span>{client.formeJuridique}</span>
              {client.siret && (
                <>
                  <span>•</span>
                  <span>SIRET: {client.siret}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" icon={Printer} onClick={onPrint} />
          <Button variant="outline" icon={Download} onClick={onExport} />
          <Button icon={Edit} onClick={onEdit}>
            Modifier
          </Button>
        </div>
      </div>
    </div>
  );
};