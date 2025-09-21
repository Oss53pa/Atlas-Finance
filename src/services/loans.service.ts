import { apiClient } from '@/lib/api';
import { 
  Loan, 
  LoanSearchParams, 
  PaginatedResponse, 
  ApiResponse 
} from '@/types';

export class LoansService {
  static async getLoans(params?: LoanSearchParams): Promise<PaginatedResponse<Loan>> {
    return apiClient.get<PaginatedResponse<Loan>>('/loans', params);
  }

  static async getLoan(id: string): Promise<Loan> {
    return apiClient.get<Loan>(`/loans/${id}`);
  }

  static async createLoan(loanData: { bookId: string; userId?: string }): Promise<Loan> {
    return apiClient.post<Loan>('/loans', loanData);
  }

  static async returnLoan(id: string): Promise<Loan> {
    return apiClient.put<Loan>(`/loans/${id}/return`);
  }

  static async extendLoan(id: string, days?: number): Promise<Loan> {
    return apiClient.put<Loan>(`/loans/${id}/extend`, { days });
  }

  static async getUserLoans(userId?: string, params?: Omit<LoanSearchParams, 'userId'>): Promise<PaginatedResponse<Loan>> {
    const url = userId ? `/loans/user/${userId}` : '/loans/my';
    return apiClient.get<PaginatedResponse<Loan>>(url, params);
  }

  static async getActiveLoans(params?: Omit<LoanSearchParams, 'status'>): Promise<PaginatedResponse<Loan>> {
    return apiClient.get<PaginatedResponse<Loan>>('/loans/active', params);
  }

  static async getOverdueLoans(params?: Omit<LoanSearchParams, 'overdue'>): Promise<PaginatedResponse<Loan>> {
    return apiClient.get<PaginatedResponse<Loan>>('/loans/overdue', params);
  }

  static async getLoanHistory(params?: LoanSearchParams): Promise<PaginatedResponse<Loan>> {
    return apiClient.get<PaginatedResponse<Loan>>('/loans/history', params);
  }

  static async calculateLateFee(id: string): Promise<{ lateFee: number }> {
    return apiClient.get<{ lateFee: number }>(`/loans/${id}/late-fee`);
  }

  static async payLateFee(id: string, amount: number): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/loans/${id}/pay-fee`, { amount });
  }

  static async renewLoan(id: string): Promise<Loan> {
    return apiClient.put<Loan>(`/loans/${id}/renew`);
  }

  static async getLoanStatistics(): Promise<{
    totalLoans: number;
    activeLoans: number;
    overdueLoans: number;
    returnedLoans: number;
    averageLoanDuration: number;
    popularBooks: Array<{ bookId: string; title: string; loanCount: number }>;
  }> {
    return apiClient.get('/loans/statistics');
  }
}