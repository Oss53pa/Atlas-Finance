/**
 * System Complete Service
 */
import { apiService } from './api';

export interface SystemInfo {
  version: string;
  environment: string;
  uptime: number;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalCompanies: number;
  storageUsed: number;
}

export interface SystemModule {
  name: string;
  status: 'active' | 'inactive' | 'error';
  version: string;
}

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  description?: string;
  url: string;
}

class SystemService {
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const response = await apiService.get<SystemInfo>('/api/v1/system/info/');
      return response.data as SystemInfo;
    } catch (err) { /* silent */
      return { version: '4.1.0', environment: 'development', uptime: 0 };
    }
  }

  async getSystemStats(): Promise<SystemStats> {
    try {
      const response = await apiService.get<SystemStats>('/api/v1/system/stats/');
      return response.data as SystemStats;
    } catch (err) { /* silent */
      return { totalUsers: 0, activeUsers: 0, totalCompanies: 0, storageUsed: 0 };
    }
  }

  async getModules(): Promise<SystemModule[]> {
    try {
      const response = await apiService.get<SystemModule[]>('/api/v1/system/modules/');
      return response.data as SystemModule[];
    } catch (err) { /* silent */
      return [];
    }
  }

  async globalSearch(query: string): Promise<SearchResult[]> {
    try {
      const response = await apiService.get<SearchResult[]>('/api/v1/system/search/', { params: { q: query } });
      return response.data as SearchResult[];
    } catch (err) { /* silent */
      return [];
    }
  }
}

export const systemService = new SystemService();
export default systemService;
