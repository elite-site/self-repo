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
  const [passwordEdited, setPasswordEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRollNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRollNo(value);
    if (!passwordEdited) setPassword(value.toUpperCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(rollNo.trim().toUpperCase(), password || rollNo.trim().toUpperCase());
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
    <div className="w-full bg-white border border-neutral-200 rounded-2xl shadow-[0_10px_30px_rgb(17_17_17/0.06)] p-7 sm:p-9 space-y-6 text-left">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 text-elite-red flex items-center justify-center shrink-0">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-elite-black font-display leading-tight">
            Student Portal Login
          </h2>
          <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold mt-0.5">
            Sign in with your roll number
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-rollno" className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            Roll Number
          </label>
          <div className="relative">
            <UserRound className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="login-rollno"
              type="text"
              placeholder="e.g. 25K61A1201"
              autoCapitalize="characters"
              value={rollNo}
              onChange={handleRollNoChange}
              required
              className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-4 py-3 text-sm text-elite-black placeholder:text-neutral-400 focus:outline-none focus:border-elite-red focus:ring-2 focus:ring-red-500/15 transition-all cursor-text"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            Password
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="login-password"
              type="password"
              placeholder="Your roll number (auto-filled)"
              value={password}
              onChange={(e) => {
                setPasswordEdited(true);
                setPassword(e.target.value);
              }}
              className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-4 py-3 text-sm text-elite-black placeholder:text-neutral-400 focus:outline-none focus:border-elite-red focus:ring-2 focus:ring-red-500/15 transition-all cursor-text"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-neutral-50 border border-neutral-100 text-[11px] text-neutral-500 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-elite-red shrink-0 mt-0.5" />
          <span>
            Your password is the same as your roll number — it fills in automatically. Leave it as is to sign in with just your roll number.
          </span>
        </div>

        {error && (
          <div className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-elite-darkred text-[11px] font-medium leading-relaxed">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-elite-red hover:bg-elite-darkred active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-elite-red transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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