import { ClosurePeriod, ClosureStats, ClosureFilters, ClosureStep } from '../types/periodic-closures.types';

class PeriodicClosuresService {
  async getPeriods(filters?: ClosureFilters): Promise<ClosurePeriod[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockPeriods: ClosurePeriod[] = [
      {
        id: '1',
        type: 'monthly',
        period: 'Mars 2024',
        status: 'closed',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-04-05'),
        closure_deadline: new Date('2024-04-10'),
        fiscal_year: '2024',
        steps: [],
        syscohada_compliance_score: 98,
        legal_requirements_met: true,
        audit_trail_complete: true,
        documents_generated: ['balance', 'grand-livre', 'journal'],
        approvals_required: ['chef-comptable', 'directeur-financier'],
        approvals_received: ['chef-comptable', 'directeur-financier'],
        region: 'CEMAC',
        business_sector: 'commercial',
        total_duration: '4 jours',
        created_by: 'admin',
        approved_by: 'Directeur Financier',
        locked_by: 'admin',
        retention_until: new Date('2034-04-05')
      },
      {
        id: '2',
        type: 'quarterly',
        period: 'T1 2024',
        status: 'in_progress',
        startDate: new Date('2024-04-01'),
        closure_deadline: new Date('2024-04-20'),
        fiscal_year: '2024',
        steps: [],
        syscohada_compliance_score: 85,
        legal_requirements_met: false,
        audit_trail_complete: true,
        documents_generated: [],
        approvals_required: ['chef-comptable', 'directeur-financier', 'commissaire-aux-comptes'],
        approvals_received: ['chef-comptable'],
        region: 'UEMOA',
        business_sector: 'services',
        created_by: 'admin',
        retention_until: new Date('2034-04-20')
      },
      {
        id: '3',
        type: 'annual',
        period: 'Exercice 2023',
        status: 'approval_pending',
        startDate: new Date('2024-01-01'),
        closure_deadline: new Date('2024-04-30'),
        fiscal_year: '2023',
        steps: [],
        syscohada_compliance_score: 100,
        legal_requirements_met: true,
        audit_trail_complete: true,
        documents_generated: ['bilan', 'compte-resultat', 'tafire', 'annexes'],
        approvals_required: ['chef-comptable', 'directeur-financier', 'commissaire-aux-comptes', 'conseil-administration'],
        approvals_received: ['chef-comptable', 'directeur-financier', 'commissaire-aux-comptes'],
        region: 'CEMAC',
        business_sector: 'industrial',
        total_duration: '28 jours',
        created_by: 'admin',
        retention_until: new Date('2033-12-31')
      }
    ];

    return mockPeriods;
  }

  async getPeriod(id: string): Promise<ClosurePeriod | null> {
    const periods = await this.getPeriods();
    return periods.find(p => p.id === id) || null;
  }

  async getSteps(periodId: string): Promise<ClosureStep[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return [
      {
        id: 's1',
        name: 'Vérification balance',
        description: 'Vérifier que la balance est équilibrée',
        status: 'completed',
        order: 1,
        duration: '2h',
        estimated_duration: '2h',
        syscohada_compliance: true,
        mandatory: true,
        category: 'preparation',
        created_entries: 0,
        validated_by: 'Chef Comptable',
        validation_date: new Date(),
        syscohada_reference: 'Art. 8-9',
        controls: [
          {
            id: 'c1',
            name: 'Balance équilibrée',
            type: 'balance_check',
            status: 'passed',
            message: 'Débit = Crédit',
            severity: 'info',
            auto_correctable: false
          }
        ]
      },
      {
        id: 's2',
        name: 'Provisions clients douteux',
        description: 'Calculer et constater les provisions',
        status: 'in_progress',
        order: 2,
        estimated_duration: '4h',
        syscohada_compliance: true,
        mandatory: true,
        category: 'provisions',
        created_entries: 12,
        syscohada_reference: 'Art. 45',
        controls: []
      },
      {
        id: 's3',
        name: 'Dotations amortissements',
        description: 'Calculer les dotations aux amortissements',
        status: 'pending',
        order: 3,
        estimated_duration: '3h',
        syscohada_compliance: true,
        mandatory: true,
        category: 'amortissement',
        dependencies: ['s2'],
        syscohada_reference: 'Art. 35-36',
        controls: []
      }
    ];
  }

  async executeStep(periodId: string, stepId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async validatePeriod(periodId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async getStats(): Promise<ClosureStats> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      totalPeriods: 15,
      openPeriods: 2,
      inProgressPeriods: 3,
      closedPeriods: 10,
      avgCompletionTime: 6.5,
      complianceRate: 95
    };
  }
}

export const periodicClosuresService = new PeriodicClosuresService();