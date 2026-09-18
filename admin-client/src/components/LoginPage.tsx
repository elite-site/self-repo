import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { adminApi } from '../services/api';
import { AdminUser } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: AdminUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await adminApi.login(email, password);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm text-left">
        {/* ELITE Crest & Header */}
        <div className="text-center mb-8 space-y-3">
          <img
            src="/admin/elite-logo.png"
            alt="ELITE Crest"
            className="w-16 h-16 object-contain mx-auto"
          />
          <div>
            <h1 className="text-xl font-extrabold text-elite-black font-display tracking-tight">
              <span className="text-elite-red">ELITE </span>SELF INTRODUCTION
            </h1>
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mt-0.5">
              Dept. of Information Technology • Organizer Portal
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-elite-darkred text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-elite-red" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              Organizer Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="admin@club.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white border border-neutral-200 rounded-lg pl-9 pr-4 py-2.5 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-elite-red transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white border border-neutral-200 rounded-lg pl-9 pr-4 py-2.5 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-elite-red transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-lg bg-elite-red hover:bg-elite-darkred text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-red-600/20 transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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

        <div className="mt-8 pt-4 border-t border-neutral-100 text-center text-[11px] text-neutral-400">
          SASI Institute of Technology & Engineering
        </div>
      </div>
    </div>
  );
};
