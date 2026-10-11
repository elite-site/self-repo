import axios from 'axios';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // If served directly from unified backend (e.g. port 5001), use relative /api
    if (isLocalhost && window.location.port === '5001') {
      return '/api';
    }
  }
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
  let clean = raw.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean.replace(/\/+$/, '');
}

export const client = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  status: number;
  details?: ApiFieldError[];
  requestId?: string;
  response?: any;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: ApiFieldError[];
  requestId?: string;
  response?: any;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.status = payload.status;
    this.details = payload.details;
    this.requestId = payload.requestId;
    this.response = payload.response;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status || (error.code === 'ECONNABORTED' ? 408 : 0);
    const data = error.response?.data as any;

    let code = 'NETWORK_ERROR';
    if (status === 400) code = 'VALIDATION_ERROR';
    else if (status === 401) code = 'UNAUTHORIZED';
    else if (status === 403) code = 'FORBIDDEN';
    else if (status === 404) code = 'NOT_FOUND';
    else if (status === 409) code = 'CONFLICT';
    else if (status === 429) code = 'RATE_LIMITED';
    else if (status >= 500) code = 'SERVER_ERROR';
    else if (error.code === 'ECONNABORTED') code = 'TIMEOUT';

    if (data?.error && typeof data.error === 'string') {
      code = data.error;
    } else if (data?.code && typeof data.code === 'string') {
      code = data.code;
    }

    let message = data?.message || error.message || 'An unexpected error occurred';
    if (status === 0) {
      message = 'Network error. Please check your internet connection.';
    }

    const details = Array.isArray(data?.details) ? data.details : undefined;
    const requestId = data?.requestId || (error.response?.headers?.['x-request-id'] as string | undefined);

    return new ApiError({
      code,
      message,
      status,
      details,
      requestId,
      response: error.response,
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      code: 'UNKNOWN_ERROR',
      message: error.message,
      status: 500,
    });
  }

  return new ApiError({
    code: 'UNKNOWN_ERROR',
    message: String(error) || 'An unexpected error occurred',
    status: 500,
  });
}

// Automatically attach Bearer token if present in localStorage (cross-domain & iOS Safari support)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('student_token');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Centralized 401 handler: purge token when authenticated requests are rejected
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = normalizeError(error);

    if (apiError.status === 401 && typeof window !== 'undefined') {
      const url = error?.config?.url || '';
      if (url.includes('/student/') && !url.includes('/student/me')) {
        localStorage.removeItem('student_token');
        window.dispatchEvent(new CustomEvent('elite-session-expired'));
      }
    }

    return Promise.reject(apiError);
  }
);

const memoryCache = new Map<string, { expiresAt: number; data: any }>();

export async function cachedFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = memoryCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }
  const fresh = await fetcher();
  memoryCache.set(key, { expiresAt: now + ttlMs, data: fresh });
  return fresh;
}

export function invalidateApiCache(): void {
  memoryCache.clear();
}

/** Absolute URL for a media path returned by the API (works in <video src>). */
export function resolveMediaUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (client.defaults.baseURL ?? '')
    .replace(/\/api\/?$/, '');
  return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}
