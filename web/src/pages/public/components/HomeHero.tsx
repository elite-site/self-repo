import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { HomeSpotlightCard } from './HomeSpotlightCard';

interface HomeHeroProps {
  onSignIn: () => void;
  loading: boolean;
  featuredStudents: any[];
  error?: string | null;
  onRetry?: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  onSignIn,
  loading,
  featuredStudents,
  error,
  onRetry,
}) => {
  return (
    <section className="border-b border-edge bg-surface">
      <div className="mx-auto grid grid-cols-1 max-w-canvas items-center gap-12 px-6 pb-16 pt-14 sm:px-10 sm:pb-20 sm:pt-20 lg:grid-cols-12 lg:gap-16">
        <div className="min-w-0 lg:col-span-6">
          <p className="text-label-md uppercase tracking-widest text-ink-brand">
            Department of Information Technology
          </p>
          <h1 className="mt-4 font-heading text-headline-xl-mobile font-extrabold tracking-tight text-ink sm:text-headline-xl">
            Meet the department, one student at a time.
          </h1>
          <p className="mt-5 max-w-[52ch] text-body-lg text-ink-secondary">
            Browse verified profiles, explore student portfolios, and register for department
            events. Sign in to publish your own.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={onSignIn} className="btn btn-primary min-h-[44px] px-5 py-2.5">
              <span>Student Sign In</span>
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <Link to="/students" className="btn btn-secondary min-h-[44px] px-5 py-2.5">
              <Users size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Browse directory</span>
            </Link>
          </div>
          <p className="mt-3 text-label-md text-ink-muted">
            Sign in with your verified college Google account (@sasi.ac.in)
          </p>
        </div>

        <div className="min-w-0 lg:col-span-6">
          <HomeSpotlightCard
            loading={loading}
            featuredStudents={featuredStudents}
            error={error}
            onRetry={onRetry}
          />
        </div>
      </div>
    </section>
  );
};
