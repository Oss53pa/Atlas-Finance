import { BaseApiService } from '../lib/base-api.service';
import { apiClient } from '../lib/api-client';

export interface SystemInfo {
  name: string;
  version: string;
  description: string;
  environment: 'development' | 'production';
  features: {
    syscohada_compliant: boolean;
    multi_currency: boolean;
    ssl_enabled: boolean;
    modules_count: number;
  };
}

export interface SystemStats {
  users: {
    total: number;
    active: number;
  };
  companies: {
    total: number;
    active: number;
  };
  system: {
    uptime: string;
    database: string;
    cache: string;
  };
}

export interface SystemModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  active: boolean;
  features: string[];
}

export interface SearchResult {
  type: string;
  title: string;
  subtitle: string;
  url: string;
  icon: string;
}

class SystemService {
  async getInfo(): Promise<SystemInfo> {
    return apiClient.get('/api/system/info/');
  }

  async getStats(): Promise<SystemStats> {
    return apiClient.get('/api/system/stats/');
  }

  async getModules(): Promise<{ count: number; modules: SystemModule[] }> {
    return apiClient.get('/api/system/modules/');
  }

  async globalSearch(query: string): Promise<{ query: string; count: number; results: SearchResult[] }> {
    return apiClient.post('/api/system/search/', { query });
  }
}

export const systemService = new SystemService();