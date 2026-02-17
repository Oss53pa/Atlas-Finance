export interface DossierRecouvrement {
  id: string;
  numeroRef: string;
  client: string;
  montantPrincipal: number;
  interets: number;
  frais: number;
  montantTotal: number;
  montantPaye: number;
  nombreFactures: number;
  dsoMoyen: number;
  dateOuverture: string;
  statut: 'actif' | 'suspendu' | 'cloture' | 'juridique';
  typeRecouvrement: 'amiable' | 'judiciaire' | 'huissier';
  responsable: string;
  derniereAction: string;
  dateAction: string;
  typeAction: 'APPEL' | 'EMAIL' | 'COURRIER' | 'SMS' | 'VISITE' | 'MISE_EN_DEMEURE' | 'PROCEDURE_JUDICIAIRE';
  prochainEtape: string;
}
