// ML Service - Stub
const mlService = {
  getAccountRecommendations: async () => [],
  getTreasuryForecast: async () => [],
  analyzeClientRisk: async () => ({ score: 0 }),
  getRecentAnomalies: async () => [],
  getDashboard: async () => ({})
};

export default mlService;
export const getAccountRecommendations = mlService.getAccountRecommendations;
export const getTreasuryForecast = mlService.getTreasuryForecast;
export const analyzeClientRisk = mlService.analyzeClientRisk;
export const getRecentAnomalies = mlService.getRecentAnomalies;
export const getDashboard = mlService.getDashboard;
