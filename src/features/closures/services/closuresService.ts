import {
  ClotureSession,
  BalanceAccount,
  Provision,
  EcritureCloture,
  Amortissement,
  ClotureStats,
  ClotureType,
} from '../types/closures.types';

class ClosuresService {
  async getSessions(): Promise<ClotureSession[]> {
    return Promise.resolve([
      {
        id: 1,
        type: 'MENSUELLE',
        periode: 'Janvier 2025',
        exercice: '2025',
        dateDebut: '2025-01-01',
        dateFin: '2025-01-31',
        dateCreation: '2025-02-01',
        statut: 'EN_COURS',
        creePar: 'Admin',
        progression: 65,
      },
      {
        id: 2,
        type: 'ANNUELLE',
        periode: 'Exercice 2024',
        exercice: '2024',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        dateCreation: '2025-01-15',
        statut: 'VALIDEE',
        creePar: 'Comptable',
        progression: 100,
      },
    ]);
  }

  async createSession(session: Omit<ClotureSession, 'id'>): Promise<ClotureSession> {
    return Promise.resolve({
      ...session,
      id: Date.now(),
    });
  }

  async getBalance(sessionId: string | number): Promise<BalanceAccount[]> {
    return Promise.resolve([
      {
        compte: '101000',
        libelle: 'Capital social',
        debit: 0,
        credit: 10000000,
        soldeDebiteur: 0,
        soldeCrediteur: 10000000,
      },
      {
        compte: '411001',
        libelle: 'Client ABC Corp',
        debit: 1500000,
        credit: 1200000,
        soldeDebiteur: 300000,
        soldeCrediteur: 0,
      },
      {
        compte: '512100',
        libelle: 'Banque BCEAO',
        debit: 5200000,
        credit: 4800000,
        soldeDebiteur: 400000,
        soldeCrediteur: 0,
      },
    ]);
  }

  async getProvisions(sessionId: string | number): Promise<Provision[]> {
    return Promise.resolve([
      {
        id: 1,
        compteClient: '411001',
        client: 'Client ABC Corp',
        solde: 300000,
        anciennete: 210,
        tauxProvision: 50,
        montantProvision: 150000,
        statut: 'PROPOSEE',
        dateProposition: '2025-01-31',
      },
      {
        id: 2,
        compteClient: '411002',
        client: 'Client XYZ Ltd',
        solde: 200000,
        anciennete: 400,
        tauxProvision: 100,
        montantProvision: 200000,
        statut: 'PROPOSEE',
        dateProposition: '2025-01-31',
      },
    ]);
  }

  async validerProvision(
    provisionId: string | number,
    action: 'VALIDER' | 'REJETER'
  ): Promise<Provision> {
    return Promise.resolve({
      id: provisionId,
      compteClient: '411001',
      client: 'Client',
      solde: 300000,
      anciennete: 210,
      tauxProvision: 50,
      montantProvision: 150000,
      statut: action === 'VALIDER' ? 'VALIDEE' : 'REJETEE',
      dateProposition: '2025-01-31',
      dateValidation: new Date().toISOString(),
    });
  }

  async getAmortissements(sessionId: string | number): Promise<Amortissement[]> {
    return Promise.resolve([
      {
        id: 1,
        immobilisation: '245000',
        libelleImmobilisation: 'Matériel informatique',
        valeurAcquisition: 5000000,
        amortissementCumule: 2000000,
        dotationExercice: 1000000,
        tauxAmortissement: 20,
        statut: 'CALCULE',
      },
    ]);
  }

  async getEcritures(sessionId: string | number): Promise<EcritureCloture[]> {
    return Promise.resolve([
      {
        id: 1,
        numero: 'CL-000001',
        date: '2025-01-31',
        libelle: 'Provision créances douteuses - Client ABC',
        compteDebit: '491100',
        compteCredit: '4911',
        montant: 150000,
        statut: 'VALIDEE',
        typeOperation: 'PROVISION',
      },
    ]);
  }

  async createEcriture(
    ecriture: Omit<EcritureCloture, 'id'>
  ): Promise<EcritureCloture> {
    return Promise.resolve({
      ...ecriture,
      id: Date.now(),
    });
  }

  async validerEcriture(ecritureId: string | number): Promise<EcritureCloture> {
    return Promise.resolve({
      id: ecritureId,
      numero: 'CL-000001',
      date: '2025-01-31',
      libelle: 'Test',
      compteDebit: '491100',
      compteCredit: '4911',
      montant: 150000,
      statut: 'VALIDEE',
      typeOperation: 'PROVISION',
    });
  }

  async getStats(sessionId: string | number): Promise<ClotureStats> {
    return Promise.resolve({
      totalProvisions: 2,
      totalAmortissements: 5,
      totalRegularisations: 3,
      totalEcritures: 10,
      ecrituresValidees: 7,
      ecrituresEnAttente: 3,
    });
  }

  async cloturerSession(sessionId: string | number): Promise<ClotureSession> {
    return Promise.resolve({
      id: sessionId,
      type: 'MENSUELLE',
      periode: 'Janvier 2025',
      exercice: '2025',
      dateDebut: '2025-01-01',
      dateFin: '2025-01-31',
      dateCreation: '2025-02-01',
      statut: 'CLOTUREE',
      creePar: 'Admin',
      progression: 100,
    });
  }
}

export const closuresService = new ClosuresService();