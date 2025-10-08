import { ClientDetail, Facture, Paiement } from '../types/client.types';

class ClientService {
  async getClient(id: string): Promise<ClientDetail> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      id,
      code: 'CLI-2024-001',
      nom: 'ENTREPRISE DEMO SARL',
      nomCommercial: 'Demo Corp',
      formeJuridique: 'SARL',
      siret: '12345678901234',
      codeAPE: '6201Z',
      numeroTVA: 'FR12345678901',
      capitalSocial: 50000,
      dateCreation: '2018-01-15',
      secteurActivite: 'Services informatiques',
      effectif: 25,
      chiffreAffairesConnu: 2500000,
      adresseFacturation: {
        rue: '123 Avenue des Champs',
        ville: 'Paris',
        codePostal: '75008',
        pays: 'France'
      },
      contacts: {
        comptabilite: {
          nom: 'Marie Dupont',
          email: 'compta@demo.fr',
          telephone: '+33 1 23 45 67 89'
        },
        principal: {
          nom: 'Jean Martin',
          fonction: 'Directeur Général',
          email: 'contact@demo.fr',
          telephone: '+33 1 23 45 67 90'
        }
      },
      comptabilite: {
        compteCollectif: '411000',
        comptesAuxiliaires: ['411001', '411002'],
        regimeTVA: 'NORMAL',
        tauxTVADefaut: 20,
        exonerationTVA: false,
        modeReglement: 'VIREMENT',
        conditionsPaiement: 'Net 30 jours',
        delaiPaiement: 30,
        plafondEncours: 100000,
        deviseFacturation: 'EUR'
      },
      banque: {
        iban: 'FR7612345678901234567890123',
        bic: 'BNPAFRPPXXX',
        domiciliation: 'BNP Paribas Paris'
      },
      classification: {
        categorie: 'PME',
        zoneGeographique: 'Île-de-France',
        responsableCommercial: 'Sophie Bernard',
        notationInterne: 'A',
        clientStrategique: true
      },
      financier: {
        chiffreAffairesAnnuel: 450000,
        encours: 85000,
        soldeComptable: 25000,
        impayesEnCours: 5000,
        delaistMoyenPaiement: 35,
        tauxRetard: 8,
        scoreSolvabilite: 85,
        limiteCredit: 100000,
        caAnneePrecedente: 420000,
        evolution: 7.1
      },
      statut: 'ACTIF',
      remarques: 'Client stratégique - Excellent payeur'
    };
  }

  async getFactures(clientId: string): Promise<Facture[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return [
      {
        id: '1',
        numero: 'FA-2024-001',
        date: '2024-01-15',
        echeance: '2024-02-15',
        montantHT: 15000,
        montantTVA: 3000,
        montantTTC: 18000,
        solde: 0,
        statut: 'PAYEE'
      },
      {
        id: '2',
        numero: 'FA-2024-002',
        date: '2024-02-10',
        echeance: '2024-03-12',
        montantHT: 12000,
        montantTVA: 2400,
        montantTTC: 14400,
        solde: 7200,
        statut: 'PAYEE_PARTIELLEMENT'
      },
      {
        id: '3',
        numero: 'FA-2024-003',
        date: '2024-03-05',
        echeance: '2024-04-05',
        montantHT: 20000,
        montantTVA: 4000,
        montantTTC: 24000,
        solde: 24000,
        statut: 'EN_ATTENTE',
        retardJours: 5
      }
    ];
  }

  async getPaiements(clientId: string): Promise<Paiement[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return [
      {
        id: '1',
        date: '2024-02-15',
        montant: 18000,
        mode: 'Virement',
        reference: 'VIR-2024-001',
        factures: ['FA-2024-001']
      },
      {
        id: '2',
        date: '2024-03-20',
        montant: 7200,
        mode: 'Virement',
        reference: 'VIR-2024-002',
        factures: ['FA-2024-002']
      }
    ];
  }

  async updateClient(id: string, data: Partial<ClientDetail>): Promise<ClientDetail> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return this.getClient(id);
  }
}

export const clientService = new ClientService();