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
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#090B10] flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#11151C] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-left transition-colors">
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
            <h1 className="text-xl font-extrabold text-[#0F172A] dark:text-white font-heading tracking-tight">
              <span className="text-[#E11D48] dark:text-[#F43F5E]">ELITE </span>ADMIN PORTAL
            </h1>
            <p className="text-[11px] font-semibold text-[#475569] dark:text-[#9BA3AF] uppercase tracking-wider mt-0.5">
              Dept. of Information Technology • Organizer Console
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[#E11D48] dark:text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D48]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F172A] dark:text-neutral-300">
              Organizer Username
            </label>
            <div className="relative">
              <UserRound className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ADMIN"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-[#F7F8FC] dark:bg-[#0D1117] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg pl-9 pr-4 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F172A] dark:text-neutral-300">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#F7F8FC] dark:bg-[#0D1117] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg pl-9 pr-4 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-[#E4E7F2] dark:border-[#252B35] text-center text-[11px] text-[#94A3B8]">
          SASI Institute of Technology & Engineering
        </div>
      </div>
    </div>
  );
};
