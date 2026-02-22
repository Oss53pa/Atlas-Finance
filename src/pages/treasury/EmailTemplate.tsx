import React from 'react';
import { useParams } from 'react-router-dom';

const EmailTemplate: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header Email */}
        <div className="bg-[#525252] text-white p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              💰
            </div>
            <div>
              <h1 className="text-lg font-bold">Atlas Finance</h1>
              <p className="text-[#525252]/80">Système de Gestion Intégrée</p>
            </div>
          </div>
        </div>

        {/* Contenu Email */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[#171717] mb-4">
            📋 Demande de Validation - Appel de Fonds FC000{id}
          </h2>

          <p className="text-[#404040] mb-4">
            Bonjour,
          </p>

          <p className="text-[#404040] mb-4">
            Vous avez reçu une demande de validation pour l'appel de fonds suivant :
          </p>

          {/* Détails de l'appel */}
          <div className="bg-[#171717]/10 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-[#171717] mb-3">📊 Détails de l'Appel de Fonds</h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-[#737373]">Référence:</span>
                <span className="text-sm font-medium text-[#171717]">FC000{id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#737373]">Date d'émission:</span>
                <span className="text-sm font-medium text-[#171717]">17/05/2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#737373]">Date d'échéance:</span>
                <span className="text-sm font-medium text-[#171717]">23/05/2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#737373]">Initié par:</span>
                <span className="text-sm font-medium text-[#171717]">Atokouna Pamela</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#737373]">Montant demandé:</span>
                <span className="text-sm font-bold text-[#525252]">0 FCFA</span>
              </div>
            </div>
          </div>

          {/* Justification */}
          <div className="bg-[#737373]/10 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-[#737373] mb-2">📝 Justification</h3>
            <p className="text-sm text-[#404040]">
              Transfert pour charges opérationnelles - Nécessaire pour maintenir les opérations courantes de l'entreprise.
            </p>
          </div>

          {/* Actions requises */}
          <div className="bg-[#525252]/10 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-[#525252] mb-3">⚡ Action Requise</h3>
            <p className="text-sm text-[#404040] mb-3">
              Merci de valider ou rejeter cette demande en cliquant sur le lien sécurisé ci-dessous :
            </p>

            <div className="text-center">
              <a
                href={`https://atlasfinance.praedium-tech.com/validation/token-secure-${id}`}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-[#525252] text-white rounded-lg hover:bg-[#404040] transition-colors font-medium"
              >
                <span>✅</span>
                <span>Valider l'Appel de Fonds</span>
              </a>
            </div>

            <p className="text-xs text-[#737373] text-center mt-2">
              🔒 Lien sécurisé valable 7 jours
            </p>
          </div>

          {/* Informations importantes */}
          <div className="border-t border-[#e5e5e5] pt-4">
            <p className="text-xs text-[#737373]">
              <strong>Important :</strong><br/>
              • Ce lien est personnel et confidentiel<br/>
              • Il expire automatiquement le 24/05/2025<br/>
              • En cas de problème, contactez support@praedium-tech.com
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#171717] text-white p-4 text-center">
          <p className="text-sm">
            © 2025 Atlas Finance - Praedium Tech
          </p>
          <p className="text-xs text-gray-700">
            Système conforme SYSCOHADA | Sécurisé et auditable
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplate;