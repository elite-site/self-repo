import React, { useState } from 'react';
import { Lock, UserRound, AlertCircle, ArrowRight } from 'lucide-react';
import { adminApi } from '../services/api';
import { AdminUser } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: AdminUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await adminApi.login(username, password);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-surface-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-edge rounded-lg p-8 shadow-card">
        {/* IT-Associations Crest & Header */}
        <div className="text-center mb-8 space-y-3">
          <picture className="flex items-center justify-center">
            <source srcSet="/admin/elite-logo.webp" type="image/webp" />
            <img
              src="/admin/elite-logo.png"
              alt="ELITE"
              className="w-16 h-16 object-contain mx-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/elite-logo.png')) {
                  target.src = '/elite-logo.png';
                }
              }}
            />
          </picture>
          <div>
            <h1 className="text-xl font-extrabold text-ink font-heading tracking-tight">
              <span className="text-brand">ELITE </span>ADMIN PORTAL
            </h1>
            <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mt-0.5">
              Dept. of Information Technology • Organizer Console
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-status-bg-rejected border border-status-rejected text-status-rejected text-xs flex items-center gap-2.5" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 text-status-rejected" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="username" className="label">
              Organizer Username
            </label>
            <div className="relative">
              <UserRound className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                id="username"
                type="text"
                placeholder="ADMIN"
                autoCapitalize="none"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="input pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="label">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                id="password"
                type="password"
                placeholder="••••••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input pl-9"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary mt-2 w-full px-4 py-3"
            aria-busy={loading}
          >
            {/* The label stays put while loading. Replacing it with a bare
                spinner left the button with no accessible name at exactly the
                moment a screen-reader user is waiting on it. */}
            {loading ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
            )}
            <span>{loading ? 'Signing in…' : 'Sign in'}</span>
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-edge text-center text-[11px] text-ink-muted">
          SASI Institute of Technology & Engineering
        </div>
      </div>
    </div>
  );
};
