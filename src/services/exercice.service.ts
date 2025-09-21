// Service des exercices - données mock pour la démonstration
export const exerciceService = {
  getExercices: async () => {
    const exercices = [
      {
        id: '1',
        name: 'Exercice 2024',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'active',
        isCurrent: true,
        isLocked: false
      },
      {
        id: '2',
        name: 'Exercice 2023',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        status: 'closed',
        isCurrent: false,
        isLocked: true
      }
    ];
    
    return { exercices, totalPages: 1, totalCount: exercices.length, currentPage: 1 };
  },

  getCurrentExercice: async () => {
    return {
      id: '1',
      name: 'Exercice 2024',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      isCurrent: true,
      isLocked: false,
      remainingDays: 128
    };
  },

  createExercice: async (data: any) => {
    return { success: true, data };
  },

  closeExercice: async (id: string) => {
    return { success: true };
  },

  deleteExercice: async (id: string) => {
    return { success: true };
  }
};