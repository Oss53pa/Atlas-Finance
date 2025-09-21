import { apiService } from './api';

export interface CategorieImmobilisation {
  id?: number;
  nom: string;
  code: string;
  taux_amortissement_fiscal: number;
  duree_amortissement_min: number;
  duree_amortissement_max: number;
  compte_immobilisation_defaut: string;
  compte_amortissement_defaut: string;
  description?: string;
}

export interface Immobilisation {
  id?: number;
  code: string;
  designation: string;
  categorie: number;
  categorie_nom?: string;
  valeur_acquisition: number;
  date_acquisition: string;
  date_mise_service: string;
  duree_amortissement_annees: number;
  duree_amortissement_mois: number;
  methode_amortissement: 'LINEAIRE' | 'DEGRESSIF' | 'PROGRESSIF' | 'UNITES_OEUVRE';
  taux_amortissement_lineaire: number;
  coefficient_degressif?: number;
  valeur_residuelle: number;
  compte_immobilisation: number;
  compte_immobilisation_numero?: string;
  compte_amortissement: number;
  compte_amortissement_numero?: string;
  compte_dotation: number;
  compte_dotation_numero?: string;
  valeur_nette_comptable?: number;
  cumul_amortissements?: number;
  statut: 'ACTIVE' | 'CEDEE' | 'MISE_REBUT' | 'EN_COURS_CESSION';
  nature: 'CORPORELLE' | 'INCORPORELLE' | 'FINANCIERE';
  localisation?: string;
  responsable?: string;
  numero_serie?: string;
  fournisseur?: string;
  reference_facture?: string;
  tiers?: number;
}

export interface PlanAmortissement {
  id?: number;
  immobilisation: number;
  immobilisation_designation?: string;
  annee: number;
  exercice: number;
  numero_annuite: number;
  date_debut: string;
  date_fin: string;
  nombre_jours: number;
  base_amortissements: number;
  dotation_annuelle: number;
  cumul_amortissements: number;
  valeur_nette_comptable: number;
  dotation_derogatoire?: number;
  reprise_derogatoire?: number;
}

class AssetsService {
  // Categories
  async getCategories(): Promise<CategorieImmobilisation[]> {
    return [
      {
        id: 1,
        nom: 'Matériel informatique',
        code: 'MAT-INFO',
        taux_amortissement_fiscal: 25,
        duree_amortissement_min: 3,
        duree_amortissement_max: 5,
        compte_immobilisation_defaut: '218100',
        compte_amortissement_defaut: '281810',
        description: 'Ordinateurs, serveurs, imprimantes'
      },
      {
        id: 2,
        nom: 'Mobilier de bureau',
        code: 'MOB-BUR',
        taux_amortissement_fiscal: 10,
        duree_amortissement_min: 5,
        duree_amortissement_max: 10,
        compte_immobilisation_defaut: '218400',
        compte_amortissement_defaut: '281840',
        description: 'Bureaux, chaises, armoires'
      }
    ];
  }

  async getCategorieById(id: number): Promise<CategorieImmobilisation> {
    const categories = await this.getCategories();
    return categories.find(c => c.id === id) || categories[0];
  }

  async createCategorie(data: Partial<CategorieImmobilisation>): Promise<CategorieImmobilisation> {
    return { id: Date.now(), ...data } as CategorieImmobilisation;
  }

  async updateCategorie(id: number, data: Partial<CategorieImmobilisation>): Promise<CategorieImmobilisation> {
    return { id, ...data } as CategorieImmobilisation;
  }

  async deleteCategorie(id: number): Promise<void> {
    // Mock delete
    return Promise.resolve();
  }

  // Immobilisations
  async getImmobilisations(filters?: any): Promise<{ results: Immobilisation[], count: number }> {
    const mockData: Immobilisation[] = [
      {
        id: 1,
        code: 'IMM-001',
        designation: 'Ordinateur portable HP',
        categorie: 1,
        categorie_nom: 'Matériel informatique',
        valeur_acquisition: 850000,
        date_acquisition: '2024-01-15',
        date_mise_service: '2024-01-20',
        duree_amortissement_annees: 4,
        duree_amortissement_mois: 0,
        methode_amortissement: 'LINEAIRE',
        taux_amortissement_lineaire: 25,
        valeur_residuelle: 0,
        compte_immobilisation: 218100,
        compte_immobilisation_numero: '218100',
        compte_amortissement: 281810,
        compte_amortissement_numero: '281810',
        compte_dotation: 681100,
        compte_dotation_numero: '681100',
        valeur_nette_comptable: 637500,
        cumul_amortissements: 212500,
        statut: 'ACTIVE',
        nature: 'CORPORELLE',
        localisation: 'Bureau Direction',
        responsable: 'Direction Générale'
      },
      {
        id: 2,
        code: 'IMM-002',
        designation: 'Bureau direction',
        categorie: 2,
        categorie_nom: 'Mobilier de bureau',
        valeur_acquisition: 450000,
        date_acquisition: '2023-06-01',
        date_mise_service: '2023-06-15',
        duree_amortissement_annees: 10,
        duree_amortissement_mois: 0,
        methode_amortissement: 'LINEAIRE',
        taux_amortissement_lineaire: 10,
        valeur_residuelle: 0,
        compte_immobilisation: 218400,
        compte_immobilisation_numero: '218400',
        compte_amortissement: 281840,
        compte_amortissement_numero: '281840',
        compte_dotation: 681100,
        compte_dotation_numero: '681100',
        valeur_nette_comptable: 382500,
        cumul_amortissements: 67500,
        statut: 'ACTIVE',
        nature: 'CORPORELLE',
        localisation: 'Direction',
        responsable: 'Services Généraux'
      }
    ];
    
    return { results: mockData, count: mockData.length };
  }

  async getImmobilisationById(id: number): Promise<Immobilisation> {
    const { results } = await this.getImmobilisations();
    return results.find(i => i.id === id) || results[0];
  }

  async createImmobilisation(data: Partial<Immobilisation>): Promise<Immobilisation> {
    return { id: Date.now(), ...data } as Immobilisation;
  }

  async updateImmobilisation(id: number, data: Partial<Immobilisation>): Promise<Immobilisation> {
    return { id, ...data } as Immobilisation;
  }

  async deleteImmobilisation(id: number): Promise<void> {
    return Promise.resolve();
  }

  // Calculs d'amortissement
  async calculerAmortissement(immobilisationId: number): Promise<PlanAmortissement[]> {
    return [
      {
        id: 1,
        immobilisation: immobilisationId,
        immobilisation_designation: 'Ordinateur portable HP',
        annee: 2024,
        exercice: 2024,
        numero_annuite: 1,
        date_debut: '2024-01-20',
        date_fin: '2024-12-31',
        nombre_jours: 346,
        base_amortissements: 850000,
        dotation_annuelle: 212500,
        cumul_amortissements: 212500,
        valeur_nette_comptable: 637500
      }
    ];
  }

  async getTableauAmortissement(immobilisationId: number): Promise<PlanAmortissement[]> {
    return this.calculerAmortissement(immobilisationId);
  }

  // Statistiques
  async getStatistiques(): Promise<any> {
    return {
      total_immobilisations: 45,
      valeur_brute_totale: 285000000,
      cumul_amortissements: 98500000,
      valeur_nette_comptable: 186500000,
      dotation_annuelle: 24300000,
      par_categorie: [
        { categorie: 'Matériel informatique', nombre: 15, valeur_brute: 35000000, vnc: 21000000 },
        { categorie: 'Mobilier', nombre: 10, valeur_brute: 12000000, vnc: 8400000 },
        { categorie: 'Véhicules', nombre: 8, valeur_brute: 45000000, vnc: 27000000 },
        { categorie: 'Bâtiments', nombre: 5, valeur_brute: 180000000, vnc: 126000000 }
      ],
      par_statut: [
        { statut: 'ACTIVE', nombre: 40, pourcentage: 88.9 },
        { statut: 'CEDEE', nombre: 3, pourcentage: 6.7 },
        { statut: 'MISE_REBUT', nombre: 2, pourcentage: 4.4 }
      ]
    };
  }

  async exporterImmobilisations(format: string): Promise<Blob> {
    // Mock export
    return new Blob(['Mock export data'], { type: 'text/csv' });
  }
}

export const assetsService = new AssetsService();