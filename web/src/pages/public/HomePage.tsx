import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { StudentSession } from '../../types';
import { api } from '../../services/api';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { ShieldCheck, Search, ArrowRight, UserCheck } from 'lucide-react';

interface HomePageProps {
  session: StudentSession | null;
  onLogout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ session, onLogout }) => {
  const [rollNo, setRollNo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = rollNo.trim().toUpperCase();
    if (!clean) {
      setError('Please enter a valid student roll number');
      return;
    }
    setError(null);
    navigate(`/students/${clean}`);
  };

  const handleSignIn = () => {
    window.location.href = api.getOAuthAuthorizeUrl();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 flex flex-col justify-between">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="max-w-xl w-full mx-auto space-y-10">
          {/* HEADER / IDENTITY */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-100 text-xs font-mono font-bold text-[#DC2626] tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Department of Information Technology</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-[#0B192C] font-display tracking-tight leading-tight">
              ELITE STUDENT PORTAL
            </h1>

            <p className="text-sm sm:text-base text-neutral-600 font-normal leading-relaxed max-w-md mx-auto">
              Sasi Institute of Technology & Engineering (Autonomous)
            </p>
          </div>

          {/* PRIMARY ACTION: STUDENT SIGN IN */}
          <div className="pt-2">
            <button
              onClick={handleSignIn}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-sm font-bold shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>Student Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-neutral-400 mt-2 font-mono">
              Sign in with your verified college Google account (@sasi.ac.in)
            </p>
          </div>

          {/* DIVIDER */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#FAFAFA] px-3 font-mono font-bold text-neutral-400">or</span>
            </div>
          </div>

          {/* SECONDARY ACTION: VISIT STUDENT PROFILE */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs text-left space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-[#0B192C]">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#0B192C]">Visit Student Profile</h2>
                <p className="text-xs text-neutral-500">
                  Enter roll number to view verified portfolio, projects, and resume
                </p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
                  <input
                    type="text"
                    value={rollNo}
                    onChange={(e) => {
                      setRollNo(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter Roll Number (e.g. 23K61A1201)"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-[#CBD5E1] rounded-xl text-xs font-mono uppercase text-[#0B192C] placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-[#DC2626] focus:bg-white transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  View Profile
                </button>
              </div>

              {error && (
                <p className="text-[11px] text-red-600 font-medium">{error}</p>
              )}
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
