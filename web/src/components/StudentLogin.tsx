import React, { useState } from 'react';
import { KeyRound, UserRound, LogIn, Info } from 'lucide-react';
import { StudentSession } from '../types';
import { api } from '../services/api';

interface StudentLoginProps {
  onLogin: (session: StudentSession) => void;
  onError?: (message: string) => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLogin, onError }) => {
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(rollNo.trim().toUpperCase(), password);
      if (res.success) {
        onLogin({ token: res.token, student: res.student });
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid roll number or password.';
      setError(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-neutral-900 to-black text-white p-7 sm:p-8 rounded-3xl shadow-2xl border border-neutral-800 space-y-5 text-left">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-elite-red/20 border border-red-500/30 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight font-display">
            Student Portal Login
          </h2>
          <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
            Use your roll number to sign in
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
            Roll Number
          </label>
          <div className="relative">
            <UserRound className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. 25K61A1201"
              autoCapitalize="characters"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              required
              className="w-full bg-white/5 border border-neutral-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-elite-red transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
            Password
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="Your roll number (default)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-neutral-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-elite-red transition-colors"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-elite-red shrink-0 mt-0.5" />
          <span>
            First-time login? Your password is the same as your roll number. You can change it later with the coordinators.
          </span>
        </div>

        {error && (
          <div className="px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-800 text-[11px] text-red-200 font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-elite-red hover:bg-elite-darkred text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};