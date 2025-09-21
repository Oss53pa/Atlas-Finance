export interface OpportunityDetail {
  id: string;
  title: string;
  client: string;
  value: number;
  probability: number;
  expectedCloseDate: string;
  stage: 'prospection' | 'qualification' | 'proposition' | 'negociation' | 'cloture';
  lastActivity: string;
  nextAction: string;
  owner: string;
  products?: string[];
  notes?: string;
}

export interface WorkspaceData {
  opportunities: OpportunityDetail[];
  stats: {
    totalValue: number;
    averageProbability: number;
    closingSoon: number;
  };
}

export const getWorkspaceData = async (): Promise<WorkspaceData> => {
  // Simulation de données pour le moment
  return {
    opportunities: [
      {
        id: '1',
        title: 'Contrat Maintenance Annuel',
        client: 'Société ABC',
        value: 50000,
        probability: 75,
        expectedCloseDate: '2024-02-15',
        stage: 'negociation',
        lastActivity: 'Réunion de négociation',
        nextAction: 'Envoyer proposition révisée',
        owner: 'Jean Dupont'
      },
      {
        id: '2',
        title: 'Migration ERP',
        client: 'Groupe XYZ',
        value: 120000,
        probability: 60,
        expectedCloseDate: '2024-03-01',
        stage: 'proposition',
        lastActivity: 'Présentation technique',
        nextAction: 'Suivi téléphonique',
        owner: 'Marie Martin'
      }
    ],
    stats: {
      totalValue: 170000,
      averageProbability: 67.5,
      closingSoon: 2
    }
  };
};

export const updateOpportunity = async (id: string, data: Partial<OpportunityDetail>): Promise<OpportunityDetail> => {
  // Simulation de mise à jour
  console.log(`Updating opportunity ${id}:`, data);
  return { id, ...data } as OpportunityDetail;
};

export const createOpportunity = async (data: Omit<OpportunityDetail, 'id'>): Promise<OpportunityDetail> => {
  // Simulation de création
  const newOpportunity: OpportunityDetail = {
    id: Date.now().toString(),
    ...data
  };
  console.log('Creating new opportunity:', newOpportunity);
  return newOpportunity;
};