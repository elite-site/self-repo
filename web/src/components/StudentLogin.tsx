import React from 'react';
import { GraduationCap, LogIn, Info } from 'lucide-react';
import { api } from '../services/api';

export const StudentLogin: React.FC = () => {
  const handleGoogle = () => {
    window.location.href = api.getOAuthAuthorizeUrl();
  };

  return (
    <div className="w-full bg-white border border-neutral-200 rounded-2xl shadow-[0_10px_30px_rgb(17_17_17/0.06)] p-7 sm:p-9 space-y-6 text-left">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 text-elite-red flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-elite-black font-display leading-tight">
            Student Portal Login
          </h2>
          <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold mt-0.5">
            Sign in with your college email
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full py-3.5 px-4 rounded-xl bg-elite-red hover:bg-elite-darkred active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-elite-red transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
      >
        <LogIn className="w-4 h-4" />
        <span>Sign in with Google</span>
      </button>

      <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-neutral-50 border border-neutral-100 text-[11px] text-neutral-500 leading-relaxed">
        <Info className="w-3.5 h-3.5 text-elite-red shrink-0 mt-0.5" />
        <span>
          Sign in only works with the college email listed in the roster. If you can't sign in,
          your email is not registered yet — contact your coordinators.
        </span>
      </div>
    </div>
  );
};