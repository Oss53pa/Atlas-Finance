import { BaseApiService } from '../lib/base-api.service';
import { apiClient } from '../lib/api-client';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'comptable' | 'manager' | 'admin';
  is_active: boolean;
  is_superuser: boolean;
  date_joined: string | null;
  last_login: string | null;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark';
  notifications_enabled: boolean;
  email_notifications: boolean;
  default_company: string | null;
  default_fiscal_year: string | null;
  timezone: string;
  date_format: string;
  currency: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  url?: string | null;
  icon: string;
  color: string;
}

export interface NotificationsResponse {
  count: number;
  unread_count: number;
  page: number;
  page_size: number;
  results: Notification[];
}

class UserService {
  async getProfile(): Promise<UserProfile> {
    return apiClient.get('/api/user/profile/');
  }

  async getPreferences(): Promise<UserPreferences> {
    return apiClient.get('/api/user/preferences/');
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<{ message: string; preferences: UserPreferences }> {
    return apiClient.put('/api/user/preferences/', preferences);
  }

  async getNotifications(params?: {
    page?: number;
    page_size?: number;
    unread_only?: boolean;
  }): Promise<NotificationsResponse> {
    return apiClient.get('/api/user/notifications/', params);
  }

  async markNotificationRead(notificationId: string): Promise<{ message: string; notification_id: string }> {
    return apiClient.post(`/api/user/notifications/${notificationId}/read/`);
  }

  async markAllNotificationsRead(): Promise<{ message: string }> {
    return apiClient.post('/api/user/notifications/mark-all-read/');
  }
}

export const userService = new UserService();