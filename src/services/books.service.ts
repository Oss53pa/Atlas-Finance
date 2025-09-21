import { apiClient } from '@/lib/api';
import { 
  Book, 
  BookSearchParams, 
  PaginatedResponse, 
  PopularBook,
  Author,
  Category,
  Publisher,
  ApiResponse 
} from '@/types';

export class BooksService {
  static async getBooks(params?: BookSearchParams): Promise<PaginatedResponse<Book>> {
    return apiClient.get<PaginatedResponse<Book>>('/books', params);
  }

  static async getBook(id: string): Promise<Book> {
    return apiClient.get<Book>(`/books/${id}`);
  }

  static async createBook(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'authors' | 'categories' | 'publisher'> & {
    authorIds: string[];
    categoryIds: string[];
    publisherId?: string;
  }): Promise<Book> {
    return apiClient.post<Book>('/books', bookData);
  }

  static async updateBook(id: string, bookData: Partial<Book> & {
    authorIds?: string[];
    categoryIds?: string[];
    publisherId?: string;
  }): Promise<Book> {
    return apiClient.put<Book>(`/books/${id}`, bookData);
  }

  static async deleteBook(id: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/books/${id}`);
  }

  static async getPopularBooks(limit: number = 10): Promise<PopularBook[]> {
    return apiClient.get<PopularBook[]>('/books/popular', { limit });
  }

  static async searchBooks(query: string, limit: number = 20): Promise<Book[]> {
    return apiClient.get<Book[]>('/books/search', { q: query, limit });
  }

  static async getBooksByAuthor(authorId: string, params?: Omit<BookSearchParams, 'author'>): Promise<PaginatedResponse<Book>> {
    return apiClient.get<PaginatedResponse<Book>>(`/books/author/${authorId}`, params);
  }

  static async getBooksByCategory(categoryId: string, params?: Omit<BookSearchParams, 'category'>): Promise<PaginatedResponse<Book>> {
    return apiClient.get<PaginatedResponse<Book>>(`/books/category/${categoryId}`, params);
  }

  static async getBooksByPublisher(publisherId: string, params?: Omit<BookSearchParams, 'publisher'>): Promise<PaginatedResponse<Book>> {
    return apiClient.get<PaginatedResponse<Book>>(`/books/publisher/${publisherId}`, params);
  }

  // Authors
  static async getAuthors(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Author>> {
    return apiClient.get<PaginatedResponse<Author>>('/authors', params);
  }

  static async getAuthor(id: string): Promise<Author> {
    return apiClient.get<Author>(`/authors/${id}`);
  }

  static async createAuthor(authorData: Omit<Author, 'id' | 'createdAt' | 'updatedAt'>): Promise<Author> {
    return apiClient.post<Author>('/authors', authorData);
  }

  static async updateAuthor(id: string, authorData: Partial<Author>): Promise<Author> {
    return apiClient.put<Author>(`/authors/${id}`, authorData);
  }

  static async deleteAuthor(id: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/authors/${id}`);
  }

  // Categories
  static async getCategories(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Category>> {
    return apiClient.get<PaginatedResponse<Category>>('/categories', params);
  }

  static async getCategory(id: string): Promise<Category> {
    return apiClient.get<Category>(`/categories/${id}`);
  }

  static async createCategory(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    return apiClient.post<Category>('/categories', categoryData);
  }

  static async updateCategory(id: string, categoryData: Partial<Category>): Promise<Category> {
    return apiClient.put<Category>(`/categories/${id}`, categoryData);
  }

  static async deleteCategory(id: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/categories/${id}`);
  }

  // Publishers
  static async getPublishers(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Publisher>> {
    return apiClient.get<PaginatedResponse<Publisher>>('/publishers', params);
  }

  static async getPublisher(id: string): Promise<Publisher> {
    return apiClient.get<Publisher>(`/publishers/${id}`);
  }

  static async createPublisher(publisherData: Omit<Publisher, 'id' | 'createdAt' | 'updatedAt'>): Promise<Publisher> {
    return apiClient.post<Publisher>('/publishers', publisherData);
  }

  static async updatePublisher(id: string, publisherData: Partial<Publisher>): Promise<Publisher> {
    return apiClient.put<Publisher>(`/publishers/${id}`, publisherData);
  }

  static async deletePublisher(id: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/publishers/${id}`);
  }
}