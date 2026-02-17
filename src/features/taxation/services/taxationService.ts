import {
  RegimeFiscal,
  TypeDeclaration,
  DeclarationFiscale,
  ObligationFiscale,
  AlerteFiscale,
  DashboardStats,
  RapportConformite,
  CalculImpotRequest,
  CalculImpotResponse,
  DeclarationCreateRequest,
  Echeance,
  DeclarationFilters,
} from '../types/taxation.types';

class TaxationService {
  async getRegimesFiscaux(): Promise<RegimeFiscal[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [
      {
        id: 1,
        code: 'RNI',
        libelle: 'Régime Normal d\'Imposition',
        type_regime: 'RNI',
        taux_is: 30,
        taux_tva_standard: 18,
        taux_tva_reduit: 10,
        seuil_ca_annual: 0,
        plafond_deduc_charges: 0,
        declarations_obligatoires: ['TVA', 'IS', 'PATENTE'],
        date_debut_validite: '2024-01-01',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ];
  }

  async getRegimeFiscalActif(): Promise<RegimeFiscal> {
    const regimes = await this.getRegimesFiscaux();
    return regimes.find((r) => r.is_active)!;
  }

  async getTypesDeclarations(): Promise<TypeDeclaration[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [
      {
        id: 1,
        code: 'TVA_MENSUELLE',
        libelle: 'Déclaration TVA Mensuelle',
        frequence: 'MENSUELLE',
        statut: 'OBLIGATOIRE',
        jour_echeance: 15,
        mois_offset: 1,
        comptes_base_calcul: [4456, 4457],
        comptes_detail: [],
        taux_penalite_retard: 10,
        penalite_fixe: 5000,
        is_active: true,
        ordre_affichage: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ];
  }

  async getDeclarations(filters?: DeclarationFilters): Promise<DeclarationFiscale[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [];
  }

  async getDeclaration(id: number): Promise<DeclarationFiscale | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return null;
  }

  async getDashboardStats(params?: { period?: string }): Promise<DashboardStats> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      total_declarations: 48,
      declarations_pending: 5,
      declarations_overdue: 2,
      vat_due: 1250000,
      upcoming_deadlines: 8,
      compliance_rate: 94,
      total_amount: 15000000,
      total_paid: 12000000,
      pending_amount: 3000000,
      overdue_count: 2,
      by_status: {
        BROUILLON: 3,
        EN_COURS: 2,
        VALIDEE: 5,
        TRANSMISE: 12,
        ACCEPTEE: 24,
        PAYEE: 2,
      },
      monthly_evolution: [
        { month: 'Jan', count: 6, amount: 1200000 },
        { month: 'Fév', count: 7, amount: 1350000 },
        { month: 'Mar', count: 5, amount: 1180000 },
        { month: 'Avr', count: 8, amount: 1420000 },
        { month: 'Mai', count: 6, amount: 1250000 },
        { month: 'Juin', count: 7, amount: 1380000 },
        { month: 'Juil', count: 9, amount: 1450000 },
      ],
    };
  }

  async getObligations(): Promise<ObligationFiscale[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [];
  }

  async getUpcomingDeadlines(): Promise<Echeance[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [
      {
        obligation_id: 1,
        type_declaration: 'TVA Mensuelle',
        date_echeance: '2024-12-15',
        jours_restants: 5,
        responsable: 'Jean Dupont',
      },
    ];
  }

  async getAlertes(): Promise<AlerteFiscale[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [];
  }

  async genererDeclaration(data: DeclarationCreateRequest): Promise<DeclarationFiscale> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    throw new Error('Not implemented');
  }

  async validerDeclaration(id: number): Promise<DeclarationFiscale> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    throw new Error('Not implemented');
  }

  async transmettreDeclaration(id: number): Promise<DeclarationFiscale> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    throw new Error('Not implemented');
  }

  async calculerImpot(request: CalculImpotRequest): Promise<CalculImpotResponse> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      montant: request.base_calcul * 0.18,
      details: {},
      date_calcul: new Date().toISOString(),
      regime: 'RNI',
    };
  }

  async genererRapportConformite(annee?: number): Promise<RapportConformite> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      periode: {
        debut: '2024-01-01',
        fin: '2024-12-31',
      },
      societe: 'Atlas Finance SARL',
      regime_fiscal: 'RNI',
      declarations: [],
      obligations_respectees: 45,
      obligations_en_retard: 3,
      montant_penalites: 50000,
      score_conformite: 94,
      recommandations: [],
    };
  }

  async exportDeclarationPDF(id: number): Promise<Blob> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return new Blob(['mock PDF'], { type: 'application/pdf' });
  }
}

export const taxationService = new TaxationService();
export default taxationService;