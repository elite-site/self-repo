import React, { useState } from 'react';
import { Lock, UserRound, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { authApi } from '@/shared/api';
import { AdminUser } from '@/types';

export interface LoginPageProps {
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
      const res = await authApi.login(username, password);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setError('Wrong email or password.');
      }
    } catch {
      setError('Wrong email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-surface-canvas flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative ambient subtle background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-brand/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md surface border border-edge rounded-2xl p-7 sm:p-9 shadow-modal relative z-10 animate-fade-in-up">
        {/* Header with Crest */}
        <div className="text-center mb-8 space-y-3">
          <picture className="flex items-center justify-center mb-2">
            <source srcSet="/admin/elite-logo.webp" type="image/webp" />
            <img
              src="/admin/elite-logo.png"
              alt="ELITE"
              className="w-16 h-16 object-contain mx-auto drop-shadow-sm transition-transform duration-quick hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/elite-logo.png')) {
                  target.src = '/elite-logo.png';
                }
              }}
            />
          </picture>
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-[11px] font-bold uppercase tracking-wider mb-1.5 border border-brand/20">
              <ShieldCheck className="w-3 h-3" />
              <span>Organizer Console</span>
            </div>
            <h1 className="text-2xl font-bold text-ink font-heading tracking-tight">
              Admin Sign In
            </h1>
            <p className="text-xs text-ink-muted mt-1">
              Dept. of Information Technology • Self Introduction Portal
            </p>
          </div>
        </div>

        {error && (
          <div
            className="mb-5 p-3.5 rounded-xl bg-status-rejected/10 border border-status-rejected/30 text-status-rejected text-xs flex items-center gap-2.5 animate-shake"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-status-rejected" aria-hidden="true" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-xs font-semibold text-ink block">
              Organizer Username
            </label>
            <div className="relative">
              <UserRound
                className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="username"
                type="text"
                placeholder="ADMIN"
                autoCapitalize="none"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="input pl-9.5 min-h-[44px] text-sm w-full"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-ink block">
              Password
            </label>
            <div className="relative">
              <Lock
                className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="password"
                type="password"
                placeholder="••••••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input pl-9.5 min-h-[44px] text-sm w-full"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary mt-2 w-full min-h-[44px] px-4 py-3 flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            aria-busy={loading}
          >
            {loading ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
            )}
            <span className="font-semibold">{loading ? 'Signing in…' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-edge text-center text-xs text-ink-muted flex flex-col items-center gap-0.5">
          <span className="font-semibold text-ink-secondary">SASI Institute of Technology & Engineering</span>
          <span>Autonomous • Accredited by NAAC with 'A' Grade</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
