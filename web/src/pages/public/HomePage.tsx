import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { StudentSession } from '../../types';
import { api } from '../../services/api';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { PublicVideoShowcase } from '../../components/PublicVideoShowcase';
import { ShieldCheck, Search, ArrowRight, UserCheck } from 'lucide-react';

interface HomePageProps {
  session: StudentSession | null;
  onLogout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ session, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) {
      navigate('/students');
      return;
    }
    navigate(`/students?search=${encodeURIComponent(clean)}`);
  };

  const handleSignIn = () => {
    window.location.href = api.getOAuthAuthorizeUrl();
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#0F172A] flex flex-col justify-between">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-16 sm:py-20 text-center">
        <div className="max-w-xl w-full mx-auto space-y-10">
          {/* HEADER / IDENTITY */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-xs font-mono font-bold text-[#E11D48] tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Department of Information Technology</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-[#0F172A] font-heading tracking-tight leading-tight">
              ELITE STUDENT PORTAL
            </h1>

            <p className="text-sm sm:text-base text-[#475569] font-normal leading-relaxed max-w-md mx-auto">
              Sasi Institute of Technology & Engineering (Autonomous)
            </p>
          </div>

          {/* PRIMARY ACTION: STUDENT SIGN IN */}
          <div className="pt-2">
            <button
              onClick={handleSignIn}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white text-sm font-bold shadow-md shadow-indigo-600/20 transition-all hover:opacity-95 active:scale-[0.98] cursor-pointer"
            >
              <span>Student Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-[#94A3B8] mt-2 font-mono">
              Sign in with your verified college Google account (@sasi.ac.in)
            </p>
          </div>

          {/* DIVIDER */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E4E7F2]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#F7F8FC] px-3 font-mono font-bold text-[#94A3B8]">or</span>
            </div>
          </div>

          {/* SECONDARY ACTION: SEARCH STUDENT DIRECTORY */}
          <div className="bg-white border border-[#E4E7F2] rounded-lg p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-left space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#0F172A] font-heading">Search Student Directory</h2>
                <p className="text-xs text-[#475569]">
                  Search by name, roll number, or skill to view verified portfolios and projects
                </p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, roll number, or skill"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F7F8FC] border border-[#E4E7F2] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] focus:bg-white transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold transition-opacity cursor-pointer shrink-0"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Publicly visible approved introduction videos — no login required */}
        <div className="w-full max-w-6xl mx-auto mt-16 sm:mt-24">
          <PublicVideoShowcase />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
