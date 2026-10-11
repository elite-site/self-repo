import axios, { AxiosError } from 'axios';
import { AdminUser } from '@/types';

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ApiErrorDetail[];
  readonly requestId?: string;
  readonly response?: { status: number; data?: unknown };

  constructor(params: {
    message: string;
    code?: string;
    status: number;
    details?: ApiErrorDetail[];
    requestId?: string;
    response?: { status: number; data?: unknown };
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code || (params.status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'API_ERROR');
    this.status = params.status;
    this.details = params.details;
    this.requestId = params.requestId;
    this.response = params.response ?? { status: params.status };
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  const axiosErr = error as AxiosError<any>;
  if (axiosErr?.response) {
    const { status = 500, data } = axiosErr.response;
    const code =
      (typeof data === 'object' && data !== null && ('error' in data || 'code' in data))
        ? ((data as any).error || (data as any).code)
        : status === 401
        ? 'UNAUTHORIZED'
        : status === 403
        ? 'FORBIDDEN'
        : status === 404
        ? 'NOT_FOUND'
        : status === 409
        ? 'CONFLICT'
        : status === 429
        ? 'RATE_LIMITED'
        : status >= 500
        ? 'INTERNAL_SERVER_ERROR'
        : 'API_ERROR';
    const message =
      (typeof data === 'object' && data !== null && 'message' in data && typeof (data as any).message === 'string')
        ? (data as any).message
        : axiosErr.message || `Request failed with status ${status}`;
    const details =
      typeof data === 'object' && data !== null && Array.isArray((data as any).details)
        ? (data as any).details
        : undefined;
    const requestId =
      typeof data === 'object' && data !== null && 'requestId' in data && typeof (data as any).requestId === 'string'
        ? (data as any).requestId
        : undefined;

    return new ApiError({
      message,
      code,
      status,
      details,
      requestId,
      response: { status, data },
    });
  }

  // Network failure or unknown error
  const message = (error as Error)?.message || 'Network error';
  const code = (axiosErr?.code as string) || 'NETWORK_ERROR';
  return new ApiError({
    message,
    code,
    status: 0,
    response: { status: 0 },
  });
}

export const apiClient = axios.create({
  withCredentials: true, // required for httpOnly JWT cookie
});

// Attach response interceptor to normalize errors
if (apiClient.interceptors?.response?.use) {
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const normalized = normalizeApiError(error);

      // Centralized 401 session expiration event
      if (normalized.status === 401 && typeof window !== 'undefined') {
        const url = (error as any)?.config?.url || '';
        if (!url.includes('/admin/me') && !url.includes('/admin/login')) {
          window.dispatchEvent(new CustomEvent('admin-session-expired'));
        }
      }

      return Promise.reject(normalized);
    }
  );
}

export const authApi = {
  async login(username: string, password: string): Promise<{ success: boolean; user: AdminUser }> {
    try {
      const res = await apiClient.post('/admin/login', { username, password });
      return res.data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  async logout(): Promise<{ success: boolean }> {
    try {
      const res = await apiClient.post('/admin/logout');
      return res.data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  async getMe(): Promise<{ authenticated: boolean; user?: AdminUser }> {
    try {
      const res = await apiClient.get('/admin/me');
      return res.data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },
};
