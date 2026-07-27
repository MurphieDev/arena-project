// ── API Client Layer ─────────────────────────────────────────────────────────
// Centralized HTTP client with authentication, token refresh, and error handling

import type { AppUser } from '../../core/types';
import { API_ENDPOINTS } from '../../core/types';
import { authService } from '../../services/auth/AuthService';

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export class ApiError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

class ApiClient {
  private baseURL: string;
  private refreshPromise: Promise<AppUser | null> | null = null;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // In a real implementation, you'd get JWT token from secure storage
    // For now, we'll rely on the auth service to handle authentication
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      return response.json();
    }

    // Handle 401 - token expired
    if (response.status === 401) {
      // Try to refresh token
      if (!this.refreshPromise) {
        this.refreshPromise = authService.refreshToken();
      }

      try {
        const refreshedUser = await this.refreshPromise;
        this.refreshPromise = null;

        if (refreshedUser) {
          // Retry the original request with new token
          const headers = await this.getAuthHeaders();
          const retryResponse = await fetch(response.url, {
            ...response,
            headers,
          });
          return this.handleResponse<T>(retryResponse);
        }
      } catch (error) {
        this.refreshPromise = null;
        throw new ApiError('Authentication failed', 401);
      }
    }

    // Handle other errors
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || `HTTP ${response.status}`,
      response.status,
      errorData.code
    );
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers,
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    return this.handleResponse<T>(response);
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// ── Auth API Client ──────────────────────────────────────────────────────────
export class AuthApi {
  static async login(email: string, password: string): Promise<AppUser> {
    return apiClient.post<AppUser>(API_ENDPOINTS.AUTH.LOGIN, { email, password });
  }

  static async logout(): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.AUTH.LOGOUT);
  }

  static async refreshToken(): Promise<AppUser> {
    return apiClient.post<AppUser>(API_ENDPOINTS.AUTH.REFRESH);
  }

  static async getProfile(): Promise<AppUser> {
    return apiClient.get<AppUser>(API_ENDPOINTS.AUTH.PROFILE);
  }

  static async signup(
    email: string,
    password: string,
    name: string,
    role: 'user' | 'tipster' = 'user',
    termsAccepted = true,
    privacyAccepted = true,
    policyVersion = 'v1.0'
  ): Promise<AppUser> {
    return apiClient.post<AppUser>(API_ENDPOINTS.AUTH.SIGNUP, {
      email,
      password,
      name,
      role,
      termsAccepted,
      privacyAccepted,
      acceptedAt: new Date().toISOString(),
      policyVersion,
    });
  }
}

// ── Users API Client ─────────────────────────────────────────────────────────
export class UsersApi {
  static async getProfile(userId?: string): Promise<AppUser> {
    const endpoint = userId ? `${API_ENDPOINTS.USERS.PROFILE}/${userId}` : API_ENDPOINTS.USERS.PROFILE;
    return apiClient.get<AppUser>(endpoint);
  }

  static async updateProfile(updates: Partial<AppUser>): Promise<AppUser> {
    return apiClient.put<AppUser>(API_ENDPOINTS.USERS.UPDATE, updates);
  }
}

// ── Tipsters API Client ──────────────────────────────────────────────────────
export class TipstersApi {
  static async getProfile(userId?: string): Promise<any> { // TipsterProfile
    const endpoint = userId ? `${API_ENDPOINTS.TIPSTERS.PROFILE}/${userId}` : API_ENDPOINTS.TIPSTERS.PROFILE;
    return apiClient.get(endpoint);
  }

  static async getPredictions(userId?: string): Promise<any[]> {
    const endpoint = userId ? `${API_ENDPOINTS.TIPSTERS.PREDICTIONS}/${userId}` : API_ENDPOINTS.TIPSTERS.PREDICTIONS;
    return apiClient.get<any[]>(endpoint);
  }

  static async getAnalytics(userId?: string): Promise<any> {
    const endpoint = userId ? `${API_ENDPOINTS.TIPSTERS.ANALYTICS}/${userId}` : API_ENDPOINTS.TIPSTERS.ANALYTICS;
    return apiClient.get(endpoint);
  }
}

// ── Predictions API Client ───────────────────────────────────────────────────
export class PredictionsApi {
  static async getList(filters?: any): Promise<any[]> {
    const query = filters ? `?${new URLSearchParams(filters)}` : '';
    return apiClient.get<any[]>(`${API_ENDPOINTS.PREDICTIONS.LIST}${query}`);
  }

  static async create(prediction: any): Promise<any> {
    return apiClient.post<any>(API_ENDPOINTS.PREDICTIONS.CREATE, prediction);
  }
}