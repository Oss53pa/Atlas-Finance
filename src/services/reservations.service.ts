import { apiClient } from '@/lib/api';
import { 
  Reservation, 
  PaginatedResponse, 
  ApiResponse 
} from '@/types';

export class ReservationsService {
  static async getReservations(params?: {
    userId?: string;
    bookId?: string;
    status?: 'PENDING' | 'READY' | 'EXPIRED' | 'FULFILLED' | 'CANCELLED';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Reservation>> {
    return apiClient.get<PaginatedResponse<Reservation>>('/reservations', params);
  }

  static async getReservation(id: string): Promise<Reservation> {
    return apiClient.get<Reservation>(`/reservations/${id}`);
  }

  static async createReservation(reservationData: { bookId: string; userId?: string }): Promise<Reservation> {
    return apiClient.post<Reservation>('/reservations', reservationData);
  }

  static async cancelReservation(id: string): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>(`/reservations/${id}/cancel`);
  }

  static async fulfillReservation(id: string): Promise<Reservation> {
    return apiClient.put<Reservation>(`/reservations/${id}/fulfill`);
  }

  static async getUserReservations(userId?: string, params?: {
    status?: 'PENDING' | 'READY' | 'EXPIRED' | 'FULFILLED' | 'CANCELLED';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Reservation>> {
    const url = userId ? `/reservations/user/${userId}` : '/reservations/my';
    return apiClient.get<PaginatedResponse<Reservation>>(url, params);
  }

  static async getBookReservations(bookId: string, params?: {
    status?: 'PENDING' | 'READY' | 'EXPIRED' | 'FULFILLED' | 'CANCELLED';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Reservation>> {
    return apiClient.get<PaginatedResponse<Reservation>>(`/reservations/book/${bookId}`, params);
  }

  static async getReservationQueue(bookId: string): Promise<Reservation[]> {
    return apiClient.get<Reservation[]>(`/reservations/book/${bookId}/queue`);
  }

  static async notifyReservationReady(id: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/reservations/${id}/notify`);
  }

  static async extendReservationExpiry(id: string, days: number = 3): Promise<Reservation> {
    return apiClient.put<Reservation>(`/reservations/${id}/extend`, { days });
  }

  static async getReservationStatistics(): Promise<{
    totalReservations: number;
    pendingReservations: number;
    readyReservations: number;
    expiredReservations: number;
    fulfilledReservations: number;
    cancelledReservations: number;
    averageWaitTime: number;
    mostReservedBooks: Array<{ bookId: string; title: string; reservationCount: number }>;
  }> {
    return apiClient.get('/reservations/statistics');
  }
}