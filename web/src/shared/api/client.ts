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
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      const url = error.config?.url || '';
      if (url.includes('/student/') && !url.includes('/student/me')) {
        localStorage.removeItem('student_token');
        window.dispatchEvent(new CustomEvent('elite-session-expired'));
      }
    }
    return Promise.reject(error);
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
