import React from 'react';
import { Building, MapPin, Phone, Mail, Calendar, Users, Euro } from 'lucide-react';
import { ClientDetail } from '../types/client.types';
import { formatNumber, formatDate } from '@/shared/utils/formatters';

interface ClientInfoCardProps {
  client: ClientDetail;
}

export const ClientInfoCard: React.FC<ClientInfoCardProps> = ({ client }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">
          <Building className="w-5 h-5 inline mr-2" />
          Informations Générales
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-[#767676]">Forme juridique</span>
            <span className="font-medium">{client.formeJuridique}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#767676]">Secteur d'activité</span>
            <span className="font-medium">{client.secteurActivite}</span>
          </div>
          {client.effectif && (
            <div className="flex justify-between">
              <span className="text-[#767676]">Effectif</span>
              <span className="font-medium">{client.effectif} employés</span>
            </div>
          )}
          {client.capitalSocial && (
            <div className="flex justify-between">
              <span className="text-[#767676]">Capital social</span>
              <span className="font-medium">{formatNumber(client.capitalSocial)} €</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[#767676]">Date création</span>
            <span className="font-medium">{formatDate(client.dateCreation)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">
          <MapPin className="w-5 h-5 inline mr-2" />
          Coordonnées
        </h3>
        <div className="space-y-3">
          <div>
            <span className="text-[#767676] block mb-1">Adresse</span>
            <span className="font-medium">
              {client.adresseFacturation.rue}<br />
              {client.adresseFacturation.codePostal} {client.adresseFacturation.ville}<br />
              {client.adresseFacturation.pays}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#767676]" />
            <span className="font-medium">{client.contacts.principal.telephone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#767676]" />
            <span className="font-medium">{client.contacts.principal.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
};