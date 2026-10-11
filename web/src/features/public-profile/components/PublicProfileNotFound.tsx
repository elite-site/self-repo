import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { EmptyState } from '@/shared/ui/EmptyState';

export const PublicProfileNotFound: React.FC = () => {
  return (
    <div className="min-h-[100dvh] bg-[#070B16] text-slate-100 flex flex-col justify-center items-center px-4">
      <h1 className="sr-only">Profile not found</h1>
      <div className="max-w-md w-full text-center space-y-6">
        <EmptyState
          icon={ShieldCheck}
          title="Profile not found"
          description="That roll number is not on the department roster, or the profile is no longer public."
          action={
            <Link
              to="/students"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-sm font-semibold text-white shadow-md hover:from-rose-600 hover:to-pink-600 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Directory</span>
            </Link>
          }
        />
      </div>
    </div>
  );
};
